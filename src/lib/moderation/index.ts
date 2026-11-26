import "server-only";
import { db } from "../supabase";
import { blocklistHit } from "./blocklist";
import { judgeImage, judgeText, type Verdict } from "./claude";
import type { CometKind } from "../types";

export type ModerationResult = Verdict & { layer: "blocklist" | "ai" | "sticker" | "audio" };

/**
 * Pipeline de guardrail. Ordem: blocklist -> IA -> (humano, se "review").
 * Falha fechada: qualquer erro vira "review", nunca "allow".
 */
export async function moderate(input: {
  kind: CometKind;
  body?: string | null;
  mediaPath?: string | null;
  mediaType?: string | null;
}): Promise<ModerationResult> {
  const { kind, body, mediaPath, mediaType } = input;

  if (body) {
    const hit = blocklistHit(body);
    if (hit) {
      return {
        layer: "blocklist",
        decision: "block",
        reason: "Opa, tem uma palavra aí que não combina com o clima do universo 🪐",
        suggestion: null,
      };
    }
  }

  if (kind === "sticker") return { layer: "sticker", decision: "allow", reason: "Sticker curado", suggestion: null };

  if (kind === "text") return { layer: "ai", ...(await judgeText(body ?? "", "texto")) };

  if (kind === "photo") {
    if (!mediaPath) return { layer: "ai", decision: "block", reason: "Foto ausente", suggestion: null };
    const { data, error } = await db().storage.from("uploads").download(mediaPath);
    if (error || !data) return { layer: "ai", decision: "review", reason: "Não consegui abrir a foto", suggestion: null };
    const b64 = Buffer.from(await data.arrayBuffer()).toString("base64");
    const mt = (["image/jpeg", "image/png", "image/webp"].includes(mediaType ?? "") ? mediaType : "image/jpeg") as
      "image/jpeg" | "image/png" | "image/webp";
    return { layer: "ai", ...(await judgeImage(b64, mt, body)) };
  }

  // Áudio: sem transcrição configurada, vai para o gestor ouvir (30s cada, rapidinho).
  // Plugue um speech-to-text aqui e passe o texto por judgeText() para automatizar.
  if (kind === "audio") {
    const caption = body ? await judgeText(body, "legenda de áudio") : null;
    if (caption?.decision === "block") return { layer: "ai", ...caption };
    return { layer: "audio", decision: "review", reason: "Áudios passam por um gestor antes de chegar", suggestion: null };
  }

  return { layer: "ai", decision: "review", reason: "Tipo desconhecido", suggestion: null };
}
