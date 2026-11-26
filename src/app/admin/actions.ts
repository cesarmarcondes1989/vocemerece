"use server";
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminValue, cookieOptions, currentModerator, currentPerson } from "@/lib/session";
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
  if (msg && approve) await supa.from("comets").upsert({ id: msg.id, from_id: msg.from_id, to_id: msg.to_id });
  if (msg && !approve) {
    await supa.from("comets").delete().eq("id", msg.id);
    if (msg.media_path) await supa.storage.from("uploads").remove([msg.media_path]);
  }
  revalidatePath("/admin");
}
