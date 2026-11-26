import { baseUrl, tokenFor } from "@/lib/people";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";

/** CSV com o link de cada pessoa, para gravar as tags NFC. Trate como senha. */
export async function GET() {
  if (!(await currentModerator())) return new Response("sem permissão", { status: 401 });
  const { data } = await db().from("people").select("slug, name, nickname").order("name");
  const base = await baseUrl();
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = (data ?? []).map((p) => [p.slug, p.name, p.nickname, `${base}/t/${tokenFor(p.slug)}`].map(esc).join(","));
  return new Response(["slug,nome,apelido,url", ...rows].join("\n") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="tags-nfc.csv"', "cache-control": "no-store" },
  });
}
