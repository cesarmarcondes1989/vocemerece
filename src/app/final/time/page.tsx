import { redirect } from "next/navigation";
import TeamMotion from "@/components/TeamMotion";
import { getGame } from "@/lib/game";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Comet, Planet } from "@/lib/types";

export default async function FinalTime() {
  const me = await currentPerson();
  if (!me) redirect("/");
  const game = await getGame();
  if (!game.stats) redirect(game.phase === "finale" ? "/final" : "/universo");
  const [{ data: planets }, { data: comets }] = await Promise.all([
    db().from("planets").select("*"),
    db().from("comets").select("from_id, to_id").limit(20000),
  ]);
  return <TeamMotion stats={game.stats} planets={(planets ?? []) as Planet[]} comets={(comets ?? []) as Pick<Comet, "from_id" | "to_id">[]} />;
}
