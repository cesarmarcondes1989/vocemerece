import { redirect } from "next/navigation";
import Universe from "@/components/Universe";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Comet, Planet } from "@/lib/types";

export default async function UniversoPage() {
  const me = await currentPerson();
  if (!me) redirect("/");
  const supa = db();
  const [{ data: planets }, { data: comets }] = await Promise.all([
    supa.from("planets").select("*"),
    supa.from("comets").select("*").order("created_at", { ascending: false }).limit(2000),
  ]);
  return (
    <Universe
      me={{ id: me.id, nickname: me.nickname, consented: !!me.consent_at, isModerator: me.is_moderator }}
      initialPlanets={(planets ?? []) as Planet[]}
      initialComets={(comets ?? []) as Comet[]}
    />
  );
}
