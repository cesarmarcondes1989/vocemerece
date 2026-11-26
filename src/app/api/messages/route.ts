import { z } from "zod";
import { moderate } from "@/lib/moderation";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import { STICKERS } from "@/lib/types";

const Body = z.object({
  to: z.string().uuid(),
  kind: z.enum(["text", "sticker", "photo", "audio"]),
  body: z.string().trim().max(300).optional().nullable(),
  sticker: z.string().optional().nullable(),
  mediaPath: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
  capsule: z.boolean().optional(),
});

const DAILY_LIMIT = 30;       // cometas por pessoa por dia
const PER_TARGET_LIMIT = 5;   // para a mesma pessoa por dia

export async function POST(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  if (!me.consent_at) return Response.json({ error: "aceite os termos primeiro" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "mensagem inválida" }, { status: 400 });
  const m = parsed.data;

  if (m.to === me.id) return Response.json({ error: "autoelogio é lindo, mas manda pra outra pessoa 😄" }, { status: 400 });
  if (m.kind === "text" && !m.body) return Response.json({ error: "mensagem vazia" }, { status: 400 });
  if (m.kind === "sticker" && !STICKERS.some((s) => s.id === m.sticker))
    return Response.json({ error: "sticker desconhecido" }, { status: 400 });
  if ((m.kind === "photo" || m.kind === "audio") && !m.mediaPath?.startsWith(`${me.id}/`))
    return Response.json({ error: "arquivo inválido" }, { status: 400 });

  const supa = db();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: recent } = await supa.from("messages").select("to_id").eq("from_id", me.id).gte("created_at", since);
  if ((recent?.length ?? 0) >= DAILY_LIMIT)
    return Response.json({ error: "Você já mandou muitos cometas hoje. Volta amanhã! ☄️" }, { status: 429 });
  if ((recent ?? []).filter((r) => r.to_id === m.to).length >= PER_TARGET_LIMIT)
    return Response.json({ error: "Essa pessoa já recebeu muitos cometas seus hoje 😄" }, { status: 429 });

  const verdict = await moderate({ kind: m.kind, body: m.body, mediaPath: m.mediaPath, mediaType: m.mediaType });
  const status = verdict.decision === "allow" ? "approved" : verdict.decision === "block" ? "rejected" : "review";

  const { data: msg, error } = await supa
    .from("messages")
    .insert({
      from_id: me.id, to_id: m.to, kind: m.kind, body: m.body ?? null, sticker: m.sticker ?? null,
      media_path: m.mediaPath ?? null, capsule: !!m.capsule, status, moderation: verdict,
    })
    .select("id")
    .single();
  if (error || !msg) return Response.json({ error: "falha ao enviar" }, { status: 500 });

  if (status === "approved") await supa.from("comets").insert({ id: msg.id, from_id: me.id, to_id: m.to });
  if (status === "rejected" && m.mediaPath) await supa.storage.from("uploads").remove([m.mediaPath]);

  return Response.json({
    id: msg.id,
    status,
    reason: status === "approved" ? null : verdict.reason,
    suggestion: verdict.suggestion,
  });
}
