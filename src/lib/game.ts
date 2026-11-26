import "server-only";
import { db } from "./supabase";
import type { CometKind, Game } from "./types";

/** Energia que cada interação entrega ao planeta que recebe. */
export const POINTS: Record<CometKind, number> = { reaction: 1, sticker: 2, comment: 3, text: 4, photo: 5, audio: 4 };

export async function getGame(): Promise<Game> {
  const { data } = await db().from("game").select("*").eq("id", 1).single();
  return data as Game;
}

/** XP de quem doa: em dobro se o planeta ainda não está verde (espalha o carinho sem expor ninguém). */
export async function xpFor(kind: CometKind, receiverId: string, game: Game) {
  const { data } = await db().from("planets").select("energy").eq("id", receiverId).single();
  return POINTS[kind] * ((data?.energy ?? 0) < game.green_at ? 2 : 1);
}

/** Mensagem aprovada: cometa no mapa + recálculo de energia/XP (e fim de jogo, se todos ficaram verdes). */
export async function deliver(msg: { id: string; from_id: string; to_id: string }) {
  const supa = db();
  await supa.from("comets").upsert({ id: msg.id, from_id: msg.from_id, to_id: msg.to_id });
  await supa.rpc("recompute", { receiver: msg.to_id, giver: msg.from_id });
}

export async function undeliver(msg: { id: string; from_id: string; to_id: string }) {
  const supa = db();
  await supa.from("comets").delete().eq("id", msg.id);
  await supa.rpc("recompute", { receiver: msg.to_id, giver: msg.from_id });
}
