import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./supabase";
import type { Person } from "./types";

export const SESSION_COOKIE = "u26";
export const ADMIN_COOKIE = "u26adm";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou curto (mín. 32 chars)");
  return s;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");

function verify(value: string, sig: string) {
  const a = Buffer.from(sign(value));
  const b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const sessionValue = (personId: string) => `${personId}.${sign(personId)}`;
export const adminValue = () => sign("admin");

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 90,
};

/** Quem está com o planeta na mão? (identidade = posse do objeto NFC) */
export async function currentPerson(): Promise<Person | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || !verify(id, sig)) return null;
  const { data } = await db()
    .from("people")
    .select("id, slug, name, nickname, is_moderator, story, consent_at, photo_path")
    .eq("id", id)
    .maybeSingle();
  return (data as Person) ?? null;
}

/** Gestor com PIN confirmado (não depende de ter planeta: o primeiro gestor entra só com o PIN). */
export async function currentModerator(): Promise<boolean> {
  const adm = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!adm) return false;
  const a = Buffer.from(adminValue());
  const b = Buffer.from(adm);
  return a.length === b.length && timingSafeEqual(a, b);
}
