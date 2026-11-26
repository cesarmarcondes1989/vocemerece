"use server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminValue, cookieOptions, currentModerator, currentPerson } from "@/lib/session";
import { buildBoardCapsule, computeStats } from "@/lib/finale";
import { deliver, undeliver } from "@/lib/game";
import { db } from "@/lib/supabase";

export async function unlock(formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  const expected = process.env.ADMIN_PIN ?? "";
  const ok = expected.length >= 4 && pin.length === expected.length && timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
  if (ok) (await cookies()).set(ADMIN_COOKIE, adminValue(), { ...cookieOptions, maxAge: 60 * 60 * 12 });
  else await new Promise((r) => setTimeout(r, 1500));   // freia chute de PIN
  revalidatePath("/admin");
}

export async function lock() {
  (await cookies()).delete(ADMIN_COOKIE);
  revalidatePath("/admin");
}

/** Aprovar/barrar uma mensagem. Devolve o resultado para o botão mostrar na hora. */
export async function decideMessage(id: string, approve: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!(await currentModerator())) return { ok: false, error: "Sessão de gestor expirou: entre de novo com o PIN." };
  try {
    const me = await currentPerson();
    const supa = db();
    const { data: msg, error } = await supa
      .from("messages")
      .update({ status: approve ? "approved" : "rejected", decided_by: me?.id ?? null, decided_at: new Date().toISOString(), hidden: false })
      .eq("id", id)
      .select("id, from_id, to_id, media_path")
      .single();
    if (error || !msg) return { ok: false, error: error?.message ?? "mensagem não encontrada" };
    if (approve) await deliver(msg);
    else {
      await undeliver(msg);
      if (msg.media_path) await supa.storage.from("uploads").remove([msg.media_path]);
    }
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    console.error("[decideMessage]", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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

// ---------------- Recomeçar / novo jogo ----------------
const ALL = "00000000-0000-0000-0000-000000000000";

async function wipeGame() {
  const supa = db();
  // mensagens levam junto cometas e denúncias (cascata)
  await supa.from("messages").delete().neq("id", ALL);
  await supa.from("capsules").delete().neq("person_id", ALL);
  await supa.from("board_capsule").delete().eq("id", 1);
  await supa.from("planets").update({ energy: 0, received: 0, senders: 0, xp: 0, visited: 0 }).neq("id", ALL);
  await supa.from("people").update({ finale: null }).neq("id", ALL);
  await supa.from("game").update({ phase: "lobby", started_at: null, all_green_at: null, finale_at: null, stats: null }).eq("id", 1);
}

/** Recomeçar: mantém as pessoas e os perfis, zera mensagens, energia, cápsulas e filmes. */
export async function restartGame() {
  if (!(await currentModerator())) throw new Error("sem permissão");
  await wipeGame();
  revalidatePath("/admin");
}

/** Novo jogo: apaga TUDO, inclusive as pessoas cadastradas. Exige digitar APAGAR. */
export async function newGame(formData: FormData) {
  if (!(await currentModerator())) throw new Error("sem permissão");
  if (String(formData.get("confirm")).trim().toUpperCase() !== "APAGAR") return;
  await wipeGame();
  await db().from("people").delete().neq("id", ALL);   // cascata: planetas, conquistas
  revalidatePath("/admin");
}
