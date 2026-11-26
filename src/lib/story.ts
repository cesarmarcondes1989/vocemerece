import "server-only";
import { signedUrl } from "./supabase";
import type { Story } from "./types";

/** Troca o caminho das fotos da história por links assinados temporários. */
export async function withPhotoUrls(story: Story): Promise<Story> {
  return {
    ...story,
    moments: await Promise.all(
      (story.moments ?? []).map(async (m) => ({ ...m, photo: (await signedUrl("stories", m.photo)) ?? undefined })),
    ),
  };
}
