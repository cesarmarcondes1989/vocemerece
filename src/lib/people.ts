import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";

/** Mesmo algoritmo do scripts/import.mjs: token determinístico por slug (trocar TOKEN_SECRET invalida todas as tags). */
export function tokenFor(slug: string) {
  const s = process.env.TOKEN_SECRET;
  if (!s || s.length < 32) throw new Error("TOKEN_SECRET ausente ou curto (mín. 32 chars). Configure na Vercel.");
  return createHmac("sha256", s).update(slug).digest("base64url").slice(0, 22);
}

/** Domínio que vai gravado nas tags: PUBLIC_BASE_URL, ou o domínio atual. */
export async function baseUrl() {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const PALETTE = ["#ff7a59", "#ffcf5a", "#7ce0a3", "#5ac8ff", "#a78bfa", "#ff6fb5", "#f59e0b", "#34d399", "#60a5fa", "#f472b6"];

/** Espiral dourada pensada para até ~70 planetas: cada novo cadastro ganha a próxima vaga, sem mexer nos outros. */
export function slotFor(i: number) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const r = 0.44 * Math.sqrt((i + 0.5) / 70);
  return { x: 0.5 + r * Math.cos(i * golden), y: 0.5 + r * Math.sin(i * golden), color: PALETTE[i % PALETTE.length] };
}
