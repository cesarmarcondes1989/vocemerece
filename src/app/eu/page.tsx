import { redirect } from "next/navigation";
import StoryPlayer from "@/components/StoryPlayer";
import { currentPerson } from "@/lib/session";
import { withPhotoUrls } from "@/lib/story";

export default async function Eu() {
  const me = await currentPerson();
  if (!me) redirect("/");
  return <StoryPlayer nickname={me.nickname} story={await withPhotoUrls(me.story)} />;
}
