"use client";
import { useEffect, useRef, useState } from "react";
import { simClear, simCreate, simRound, type SimReport } from "@/app/admin/simulador/actions";

export default function Simulator({ initialBots }: { initialBots: number }) {
  const [n, setN] = useState(20);
  const [bots, setBots] = useState(initialBots);
  const [busy, setBusy] = useState<string | null>(null);
  const [auto, setAuto] = useState(false);
  const [report, setReport] = useState<SimReport | null>(null);
  const [feed, setFeed] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const autoRef = useRef(false);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setNote(null);
    try { await fn(); } catch (e) { setNote(`⚠️ ${e instanceof Error ? e.message : String(e)}`); }
    finally { setBusy(null); }
  }
  function absorb(r: SimReport) {
    setReport(r);
    if (r.feed.length) setFeed((f) => [...r.feed, ...f].slice(0, 40));
    return r.ok && r.phase === "playing";
  }

  // Automático: rodadas pequenas, uma depois da outra, até todos verdes (ou você pausar)
  useEffect(() => {
    autoRef.current = auto;
    if (!auto) return;
    (async () => {
      while (autoRef.current) {
        const r = await simRound(15).catch((e) => ({ ok: false, message: String(e), greens: 0, total: 0, phase: "?", feed: [] }) as SimReport);
        if (!absorb(r)) { setAuto(false); break; }
        await new Promise((res) => setTimeout(res, 1500));
      }
    })();
    return () => { autoRef.current = false; };
  }, [auto]);

  const btn = "rounded-full px-5 py-3 font-bold disabled:opacity-40";
  const locked = !!busy || auto;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        <iframe src="/telao" title="Universo ao vivo" className="h-[70vh] min-h-[480px] w-full" />
      </div>

      <div className="space-y-4">
        <section className="space-y-3 rounded-3xl bg-white/5 p-4">
          <h2 className="font-bold">1. Robôs <span className="font-normal text-muted">({bots})</span></h2>
          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={1} max={70} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-20 rounded-full bg-white/10 px-3 py-2" />
            <button disabled={locked} className={`${btn} bg-white text-black`}
              onClick={() => run("Criando robôs…", async () => { await simCreate(n); setBots((b) => b + Math.min(n, 70)); setNote(`✓ ${Math.min(n, 70)} robôs criados`); })}>+ Criar</button>
            <button disabled={locked || bots === 0} className={`${btn} border border-red-400/60 text-red-200`}
              onClick={() => confirm("Apagar todos os robôs e tudo que eles mandaram?") && run("Apagando robôs…", async () => { await simClear(); setBots(0); setReport(null); setFeed([]); setNote("✓ Robôs apagados"); })}>
              Apagar
            </button>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl bg-white/5 p-4">
          <h2 className="font-bold">2. Jogar</h2>
          <button disabled={!!busy || bots === 0} onClick={() => setAuto((a) => !a)}
            className={`${btn} w-full ${auto ? "bg-white/15" : "bg-accent text-black"}`}>
            {auto ? "⏸ Pausar" : "▶ Automático (assista o mapa)"}
          </button>
          <div className="flex gap-2">
            <button disabled={locked || bots === 0} className={`${btn} flex-1 bg-white/10 text-sm`}
              onClick={() => run("Rodada…", async () => { absorb(await simRound(60)); })}>⚡ +60</button>
            <button disabled={locked || bots === 0} className={`${btn} flex-1 bg-emerald-400 text-sm text-black`}
              onClick={() => run("Jogando até todos verdes… (até ~40s)", async () => { absorb(await simRound(150, true)); })}>🏁 Até o fim</button>
          </div>
          <p className="text-xs text-muted">No lobby, a largada é automática.</p>
        </section>

        {busy && <p className="animate-pulse rounded-2xl bg-white/5 p-3 text-sm">⏳ {busy}</p>}
        {note && <p className="rounded-2xl bg-white/5 p-3 text-sm">{note}</p>}
        {report && (
          <div className={`rounded-2xl p-3 text-sm ${report.ok ? "bg-emerald-500/15" : "bg-red-500/20"}`}>
            <p className="font-semibold">{report.ok ? report.message : `⚠️ ${report.message}`}</p>
            {report.ok && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-gradient-to-r from-[#6b7cff] to-[#3ee08f] transition-all" style={{ width: `${(report.greens / Math.max(1, report.total)) * 100}%` }} />
              </div>
            )}
          </div>
        )}
        {feed.length > 0 && (
          <section className="rounded-3xl bg-white/5 p-4">
            <h2 className="mb-2 text-sm font-bold">📡 Acontecendo agora</h2>
            <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
              {feed.map((f, i) => <li key={`${i}-${f}`} className={i < 3 ? "text-ink" : "text-muted"}>{f}</li>)}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
