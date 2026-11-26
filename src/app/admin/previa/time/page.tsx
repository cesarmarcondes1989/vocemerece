import Link from "next/link";
import { redirect } from "next/navigation";
import TeamMotion from "@/components/TeamMotion";
import { computeStats } from "@/lib/finale";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";
import type { Comet, Planet } from "@/lib/types";

export const maxDuration = 120;

/** Prévia do filme do time com os dados de AGORA. Não muda a fase do jogo nem salva nada. */
export default async function PreviaTime({ searchParams }: PageProps<"/admin/previa/time">) {
  if (!(await currentModerator())) redirect("/admin");
  const { ia } = await searchParams;
  const [stats, { data: planets }, { data: comets }] = await Promise.all([
    computeStats({ ai: ia === "1" }),
    db().from("planets").select("*"),
    db().from("comets").select("from_id, to_id").limit(20000),
  ]);
  return (
    <>
      <div className="fixed left-1/2 top-6 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/70 px-3 py-1 text-xs backdrop-blur">
        <span className="text-accent">PRÉVIA</span>
        <Link href="/admin" className="underline">sair</Link>
        {ia !== "1" ? <Link href="/admin/previa/time?ia=1" className="underline">gerar com IA (~30s)</Link> : <span>com IA ✨</span>}
      </div>
      <TeamMotion stats={stats} planets={(planets ?? []) as Planet[]} comets={(comets ?? []) as Pick<Comet, "from_id" | "to_id">[]} />
    </>
  );
}
