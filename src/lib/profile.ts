import "server-only";
import { withPhotoUrls } from "./story";
import { db, signedUrl } from "./supabase";
import type { ProfileItem, Story } from "./types";

export type ReactionSummary = Record<string, { counts: Record<string, number>; mine: string[] }>;
export type CommentView = { id: string; itemRef: string; from: string; body: string };

export type ProfileData = {
  id: string;
  nickname: string;
  name: string;
  photoUrl: string | null;
  story: Story;
  items: ProfileItem[];
  reactions: ReactionSummary;
  comments: CommentView[];
};

/** Monta o planeta de alguém. `viewerId` marca as reações do visitante; `self` inclui itens em moderação. */
export async function loadProfile(personId: string, viewerId: string, self = false): Promise<ProfileData | null> {
  const supa = db();
  const { data: p } = await supa.from("people").select("id, name, nickname, story, photo_path").eq("id", personId).maybeSingle();
  if (!p) return null;

  let itemsQ = supa.from("profile_items").select("id, text, emoji, status").eq("person_id", personId).order("created_at");
  itemsQ = self ? itemsQ.neq("status", "rejected") : itemsQ.eq("status", "approved");

  const [{ data: items }, { data: interactions }] = await Promise.all([
    itemsQ,
    supa.from("messages")
      .select("id, kind, body, sticker, item_ref, from_id, from:people!messages_from_id_fkey(nickname)")
      .eq("to_id", personId).eq("status", "approved").eq("hidden", false).in("kind", ["reaction", "comment"])
      .order("created_at"),
  ]);

  const reactions: ReactionSummary = {};
  const comments: CommentView[] = [];
  for (const m of interactions ?? []) {
    if (!m.item_ref) continue;
    if (m.kind === "reaction" && m.sticker) {
      const r = (reactions[m.item_ref] ??= { counts: {}, mine: [] });
      r.counts[m.sticker] = (r.counts[m.sticker] ?? 0) + 1;
      if (m.from_id === viewerId) r.mine.push(m.sticker);
    } else if (m.kind === "comment" && m.body) {
      comments.push({ id: m.id, itemRef: m.item_ref, body: m.body, from: (m.from as unknown as { nickname: string } | null)?.nickname ?? "alguém" });
    }
  }

  return {
    id: p.id, name: p.name, nickname: p.nickname,
    photoUrl: await signedUrl("stories", p.photo_path),
    story: await withPhotoUrls((p.story ?? {}) as Story),
    items: (items ?? []) as ProfileItem[],
    reactions, comments,
  };
}
