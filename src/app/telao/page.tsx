import { redirect } from "next/navigation";
import Universe from "@/components/Universe";
import { getGame } from "@/lib/game";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Comet, Planet } from "@/lib/types";

/** Telão: o universo ao vivo, sem jogador. Abra no notebook do projetor (precisa do PIN de gestor). */
export default async function Telao() {
  if (!(await currentModerator())) redirect("/admin");
  const supa = db();
  const [game, { data: planets }, { data: comets }] = await Promise.all([
    getGame(),
    supa.from("planets").select("*"),
    supa.from("comets").select("*").order("created_at", { ascending: false }).limit(5000),
  ]);
  return (
    <Universe spectator me={{ id: "telao", nickname: "telão", isModerator: true, hasCapsule: true }}
      initialPlanets={(planets ?? []) as Planet[]} initialComets={(comets ?? []) as Comet[]} initialGame={game} />
  );
}
