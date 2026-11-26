import Link from "next/link";
import { redirect } from "next/navigation";
import Simulator from "@/components/Simulator";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

export default async function SimuladorPage() {
  if (!(await currentModerator())) redirect("/admin");
  const { count } = await db().from("people").select("id", { count: "exact", head: true }).like("slug", "sim-%");
  return (
    <main className="mx-auto max-w-6xl space-y-4 p-5">
      <Link href="/admin" className="text-sm underline">← Torre de controle</Link>
      <h1 className="text-2xl font-bold">🤖 Simulador</h1>
      <p className="text-sm text-muted">
        Robôs entram no jogo e trocam reações, stickers e comentários de verdade no banco (sem passar pela IA).
        O mapa ao lado é o <Link href="/telao" className="underline" target="_blank">telão</Link> ao vivo (atualiza a cada 3s).
      </p>
      <Simulator initialBots={count ?? 0} />
    </main>
  );
}
