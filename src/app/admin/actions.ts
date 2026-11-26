"use server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminValue, cookieOptions, currentModerator, currentPerson } from "@/lib/session";
import { buildBoardCapsule, computeStats } from "@/lib/finale";
import { deliver, undeliver } from "@/lib/game";
import { db } from "@/lib/supabase";

export async function unlock(formData: FormData) {
  const me = await currentPerson();
  const pin = String(formData.get("pin") ?? "");
  const expected = process.env.ADMIN_PIN ?? "";
  const ok = !!me?.is_moderator && expected.length >= 4 && pin.length === expected.length &&
    timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  if (ok) (await cookies()).set(ADMIN_COOKIE, adminValue(me!.id), { ...cookieOptions, maxAge: 60 * 60 * 12 });
  revalidatePath("/admin");
}

export async function decide(formData: FormData) {
  const mod = await currentModerator();
  if (!mod) throw new Error("sem permissão");
  const id = String(formData.get("id"));
  const approve = formData.get("decision") === "approve";
  const supa = db();
  const { data: msg } = await supa
    .from("messages")
    .update({ status: approve ? "approved" : "rejected", decided_by: mod.id, decided_at: new Date().toISOString(), hidden: false })
    .eq("id", id)
    .select("id, from_id, to_id, media_path")
    .single();
  if (msg && approve) await deliver(msg);
  if (msg && !approve) {
    await undeliver(msg);
    if (msg.media_path) await supa.storage.from("uploads").remove([msg.media_path]);
  }
  revalidatePath("/admin");
}

// ---------------- Controle do jogo ----------------

async function setGame(patch: Record<string, unknown>) {
  if (!(await currentModerator())) throw new Error("sem permissão");
  await db().from("game").update(patch).eq("id", 1);
  revalidatePath("/admin");
}

export async function startGame() {
  await setGame({ phase: "playing", started_at: new Date().toISOString() });
}

export async function forceCapsule() {
  await setGame({ phase: "capsule", all_green_at: new Date().toISOString() });
}

export async function backToLobby() {
  await setGame({ phase: "lobby" });
}

export async function setGreenAt(formData: FormData) {
  const v = Number(formData.get("green_at"));
  const cap = Number(formData.get("sender_cap"));
  if (v >= 1 && cap >= 1) await setGame({ green_at: v, sender_cap: cap });
  // recalcula se alguém virou verde com a nova régua
  const supa = db();
  const { data: ps } = await supa.from("planets").select("id");
  for (const p of ps ?? []) await supa.rpc("recompute", { receiver: p.id, giver: p.id });
}

/** Grande revelação: calcula estatísticas, gera a cápsula da diretoria e libera os filmes. */
export async function revealFinale() {
  if (!(await currentModerator())) throw new Error("sem permissão");
  const supa = db();
  const [stats, board] = await Promise.all([computeStats(), buildBoardCapsule().catch((e) => { console.error(e); return null; })]);
  if (board) await supa.from("board_capsule").upsert({ id: 1, content: board, created_at: new Date().toISOString() });
  await supa.from("game").update({ phase: "finale", finale_at: new Date().toISOString(), stats }).eq("id", 1);
  revalidatePath("/admin");
}

export async function regenerateBoardCapsule() {
  if (!(await currentModerator())) throw new Error("sem permissão");
  const board = await buildBoardCapsule();
  if (board) await db().from("board_capsule").upsert({ id: 1, content: board, created_at: new Date().toISOString() });
  revalidatePath("/admin/capsula");
}

export async function decideItem(formData: FormData) {
  if (!(await currentModerator())) throw new Error("sem permissão");
  const approve = formData.get("decision") === "approve";
  await db().from("profile_items").update({ status: approve ? "approved" : "rejected" }).eq("id", String(formData.get("id")));
  revalidatePath("/admin");
}
