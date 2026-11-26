"use client";
import { useState } from "react";
import { simClear, simCreate, simRound, type SimReport } from "@/app/admin/simulador/actions";

export default function Simulator({ initialBots }: { initialBots: number }) {
  const [n, setN] = useState(20);
  const [bots, setBots] = useState(initialBots);
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<SimReport | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setNote(null);
    try { await fn(); } catch (e) { setNote(`⚠️ ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(null); }
  }
  const btn = "rounded-full px-5 py-3 font-bold disabled:opacity-40";

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-white/5 p-4">
        <h2 className="font-bold">1. Robôs <span className="font-normal text-muted">({bots} criados)</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={1} max={70} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-20 rounded-full bg-white/10 px-3 py-2" />
          <button disabled={!!busy} className={`${btn} bg-white text-black`}
            onClick={() => run("Criando robôs…", async () => { await simCreate(n); setBots((b) => b + Math.min(n, 70)); setNote(`✓ ${Math.min(n, 70)} robôs criados`); })}>+ Criar robôs</button>
          <button disabled={!!busy || bots === 0} className={`${btn} border border-red-400/60 text-red-200`}
            onClick={() => confirm("Apagar todos os robôs e tudo que eles mandaram?") && run("Apagando robôs…", async () => { await simClear(); setBots(0); setReport(null); setNote("✓ Robôs apagados"); })}>
            Apagar robôs
          </button>
        </div>
        <p className="text-xs text-muted">Para um ensaio rápido, 15–25 robôs bastam.</p>
      </section>

      <section className="space-y-3 rounded-3xl bg-white/5 p-4">
        <h2 className="font-bold">2. Jogar</h2>
        <p className="text-sm text-muted">Se o jogo estiver no lobby, a largada é dada automaticamente. Deixe o <b>/universo</b> aberto em outra aba para ver os cometas e as cores mudando.</p>
        <div className="flex flex-wrap gap-2">
          <button disabled={!!busy || bots === 0} className={`${btn} bg-accent text-black`}
            onClick={() => run("Robôs jogando uma rodada…", async () => setReport(await simRound(60)))}>⚡ Uma rodada (60 interações)</button>
          <button disabled={!!busy || bots === 0} className={`${btn} bg-emerald-400 text-black`}
            onClick={() => run("Jogando até todo mundo ficar verde… (até ~40s)", async () => setReport(await simRound(150, true)))}>🏁 Jogar até todos verdes</button>
        </div>
        <p className="text-xs text-muted">Dica: clique ⚡ algumas vezes com o universo aberto para ver o mapa mudando aos poucos. Use 🏁 para pular direto pro final.</p>
      </section>

      {busy && <p className="animate-pulse rounded-2xl bg-white/5 p-3">⏳ {busy}</p>}
      {note && <p className="rounded-2xl bg-white/5 p-3 text-sm">{note}</p>}
      {report && (
        <div className={`rounded-2xl p-4 ${report.ok ? "bg-emerald-500/15" : "bg-red-500/20"}`}>
          <p className="font-semibold">{report.ok ? report.message : `⚠️ ${report.message}`}</p>
          {report.ok && (
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-[#6b7cff] to-[#3ee08f]" style={{ width: `${(report.greens / Math.max(1, report.total)) * 100}%` }} />
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-muted">Depois do ensaio: <b>🔁 Recomeçar o jogo</b> na Torre e <b>Apagar robôs</b> aqui.</p>
    </div>
  );
}
