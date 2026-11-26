import Link from "next/link";
import { notFound } from "next/navigation";
import type { BoardCapsule } from "@/lib/finale";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";
import { regenerateBoardCapsule } from "../actions";

export const maxDuration = 300;

export default async function Capsula() {
  if (!(await currentModerator())) notFound();
  const supa = db();
  const [{ data }, { count }] = await Promise.all([
    supa.from("board_capsule").select("content, created_at").eq("id", 1).maybeSingle(),
    supa.from("capsules").select("person_id", { count: "exact", head: true }).not("para_empresa", "is", null),
  ]);
  const c = data?.content as BoardCapsule | undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-5">
      <Link href="/admin" className="text-sm underline">← Torre de controle</Link>
      <header>
        <p className="text-xs uppercase tracking-widest text-accent">Cápsula do tempo · Diretoria · abrir em dez/2027</p>
        <h1 className="text-3xl font-black">{c?.titulo ?? "Cápsula da Diretoria"}</h1>
        <p className="text-sm text-muted">{count ?? 0} pessoas escreveram para a empresa. Tudo anônimo, sintetizado por IA.</p>
      </header>
      {!c ? (
        <p className="rounded-2xl bg-white/5 p-4">Ainda não gerada. Ela é criada na <b>Grande revelação</b>, ou aqui embaixo.</p>
      ) : (
        <article className="space-y-6 leading-relaxed">
          <p className="text-lg">{c.abertura}</p>
          {c.temas.map((t) => (
            <section key={t.tema} className="rounded-3xl bg-white/5 p-5">
              <h2 className="text-xl font-bold">{t.tema} <span className="text-xs font-normal text-accent">· {t.peso}</span></h2>
              <p className="mt-2">{t.resumo}</p>
              <ul className="mt-3 space-y-1 text-sm text-muted">{t.vozes.map((v) => <li key={v}>“{v}”</li>)}</ul>
            </section>
          ))}
          {([["🎯 Pedidos concretos para 2027", c.pedidos_concretos], ["💎 O que não pode se perder", c.o_que_nao_pode_se_perder], ["⚠️ Pontos de atenção", c.pontos_de_atencao]] as const).map(([h, list]) =>
            list.length ? (
              <section key={h}><h2 className="mb-2 text-lg font-bold">{h}</h2><ul className="list-disc space-y-1 pl-5">{list.map((x) => <li key={x}>{x}</li>)}</ul></section>
            ) : null)}
          <p className="text-lg font-semibold">{c.fechamento}</p>
        </article>
      )}
      <form action={regenerateBoardCapsule}>
        <button className="rounded-full border border-white/20 px-4 py-2 text-sm">🔄 {c ? "Gerar de novo" : "Gerar agora"}</button>
      </form>
    </main>
  );
}
