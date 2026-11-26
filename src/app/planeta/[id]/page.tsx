import { notFound, redirect } from "next/navigation";
import PlanetVisit from "@/components/PlanetVisit";
import { energyColor } from "@/lib/colors";
import { getGame } from "@/lib/game";
import { loadProfile } from "@/lib/profile";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

export default async function Planeta({ params }: PageProps<"/planeta/[id]">) {
  const me = await currentPerson();
  if (!me) redirect("/");
  const { id } = await params;
  if (id === me.id) redirect("/eu");
  const [game, profile, { data: planet }] = await Promise.all([
    getGame(),
    loadProfile(id, me.id),
    db().from("planets").select("energy").eq("id", id).maybeSingle(),
  ]);
  if (!profile || !planet) notFound();
  return (
    <PlanetVisit
      profile={profile}
      color={energyColor(planet.energy, game.green_at)}
      phase={game.phase}
      consented={!!me.consent_at}
    />
  );
}
