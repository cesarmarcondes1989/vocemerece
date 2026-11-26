import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import { STICKERS } from "@/lib/types";

/** Cometas que chegaram para mim depois de `since` (aprovados agora ou liberados por um gestor). */
export async function GET(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ items: [], now: new Date().toISOString() }, { status: 401 });
  const since = new URL(req.url).searchParams.get("since") ?? new Date().toISOString();
  const { data } = await db()
    .from("messages")
    .select("id, kind, body, sticker, from:people!messages_from_id_fkey(nickname)")
    .eq("to_id", me.id).eq("status", "approved").eq("hidden", false)
    .or(`created_at.gt.${since},decided_at.gt.${since}`)
    .order("created_at", { ascending: false })
    .limit(5);
  const items = (data ?? []).map((m) => {
    const from = (m.from as unknown as { nickname: string } | null)?.nickname ?? "Alguém";
    const st = STICKERS.find((s) => s.id === m.sticker);
    const text =
      m.kind === "reaction" ? `${from} reagiu ${m.sticker} no seu planeta` :
      m.kind === "sticker" ? `${from} te deu o título ${st?.emoji ?? "✨"} ${st?.label ?? ""}` :
      m.kind === "photo" ? `${from} te mandou uma foto 📸` :
      m.kind === "comment" ? `${from} comentou: “${(m.body ?? "").slice(0, 60)}”` :
      `${from} te mandou um cometa: “${(m.body ?? "").slice(0, 60)}”`;
    return { id: m.id, text };
  });
  return Response.json({ items, now: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
