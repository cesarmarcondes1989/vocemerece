import { notFound } from "next/navigation";
import StoryPlayer from "@/components/StoryPlayer";
import { currentModerator } from "@/lib/session";
import { withPhotoUrls } from "@/lib/story";
import { db } from "@/lib/supabase";
import type { Story } from "@/lib/types";

export default async function Preview({ params }: PageProps<"/admin/preview/[slug]">) {
  if (!(await currentModerator())) notFound();
  const { slug } = await params;
  const { data } = await db().from("people").select("nickname, story").eq("slug", slug).maybeSingle();
  if (!data) notFound();
  return <StoryPlayer preview nickname={data.nickname} story={await withPhotoUrls(data.story as Story)} />;
}
