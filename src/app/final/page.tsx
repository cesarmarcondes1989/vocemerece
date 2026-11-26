import { redirect } from "next/navigation";
import PersonalMotion from "@/components/PersonalMotion";
import { personalFinale } from "@/lib/finale";
import { getGame } from "@/lib/game";
import { currentPerson } from "@/lib/session";

export default async function Final() {
  const me = await currentPerson();
  if (!me) redirect("/");
  const game = await getGame();
  if (game.phase !== "finale" && !me.is_moderator) redirect("/universo");
  const data = await personalFinale(me.id);
  if (!data) redirect("/");
  return <PersonalMotion data={data} />;
}
