import { redirect } from "next/navigation";
import Universe from "@/components/Universe";
import { getGame } from "@/lib/game";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Comet, Planet } from "@/lib/types";

export default async function UniversoPage() {
  const me = await currentPerson();
  if (!me) redirect("/");
  const supa = db();
  const [game, { data: planets }, { data: comets }, { count: capsule }] = await Promise.all([
    getGame(),
    supa.from("planets").select("*"),
    supa.from("comets").select("*").order("created_at", { ascending: false }).limit(5000),
    supa.from("capsules").select("person_id", { count: "exact", head: true }).eq("person_id", me.id),
  ]);
  return (
    <Universe
      me={{ id: me.id, nickname: me.nickname, isModerator: me.is_moderator, hasCapsule: (capsule ?? 0) > 0 }}
      initialPlanets={(planets ?? []) as Planet[]}
      initialComets={(comets ?? []) as Comet[]}
      initialGame={game}
    />
  );
}
