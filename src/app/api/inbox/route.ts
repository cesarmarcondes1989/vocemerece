import { currentPerson } from "@/lib/session";
import { db, signedUrl } from "@/lib/supabase";

const CAPSULE_OPENS = new Date("2027-12-01T00:00:00-03:00");

export async function GET() {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const supa = db();

  const [{ data: inbox }, { data: sent }] = await Promise.all([
    supa
      .from("messages")
      .select("id, kind, body, sticker, item_ref, media_path, capsule, read_at, created_at, from:people!messages_from_id_fkey(nickname)")
      .eq("to_id", me.id).eq("status", "approved").eq("hidden", false)
      .order("created_at", { ascending: false }),
    supa
      .from("messages")
      .select("id, kind, status, created_at, moderation, to:people!messages_to_id_fkey(nickname)")
      .eq("from_id", me.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const locked = new Date() < CAPSULE_OPENS;
  const received = await Promise.all(
    (inbox ?? []).map(async (m) => {
      const sealed = m.capsule && locked;
      return {
        id: m.id, kind: m.kind, itemRef: m.item_ref, capsule: m.capsule, sealed, read: !!m.read_at, created_at: m.created_at,
        from: (m.from as unknown as { nickname: string } | null)?.nickname ?? "alguém",
        body: sealed ? null : m.body,
        sticker: sealed ? null : m.sticker,
        mediaUrl: sealed ? null : await signedUrl("uploads", m.media_path),
      };
    }),
  );

  return Response.json({
    received,
    sent: (sent ?? []).map((m) => ({
      id: m.id, kind: m.kind, status: m.status, created_at: m.created_at,
      to: (m.to as unknown as { nickname: string } | null)?.nickname ?? "?",
      reason: m.status === "approved" ? null : (m.moderation as { reason?: string })?.reason ?? null,
    })),
  });
}
