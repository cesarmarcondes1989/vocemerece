"use client";
import { useEffect, useRef, useState } from "react";
import { simClear, simCreate, simTick } from "@/app/admin/simulador/actions";
import { startGame } from "@/app/admin/actions";

type Status = Awaited<ReturnType<typeof simTick>>;
const PHASE = { lobby: "Lobby (aguardando largada)", playing: "Valendo!", capsule: "Todos verdes → cápsulas", finale: "Final" } as const;

export default function Simulator({ initialBots }: { initialBots: number }) {
  const [n, setN] = useState(30);
  const [speed, setSpeed] = useState(8);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [st, setSt] = useState<Status | null>(null);
  const [bots, setBots] = useState(initialBots);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const s = await simTick(speed);
        setSt(s); setBots(s.bots);
        if (s.phase === "finale") setRunning(false);
      } finally { inFlight.current = false; }
    }, 2000);
    return () => clearInterval(t);
  }, [running, speed]);

  const act = async (label: string, fn: () => Promise<unknown>) => { setBusy(label); try { await fn(); } finally { setBusy(null); } };
  const btn = "rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-40";

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-white/5 p-4">
        <h2 className="font-bold">1. Robôs <span className="font-normal text-muted">({bots} no jogo)</span></h2>
        <div className="flex flex-wrap items-center gap-2">
          <input type="number" min={1} max={70} value={n} onChange={(e) => setN(Number(e.target.value))} className="w-20 rounded-full bg-white/10 px-3 py-2" />
          <button disabled={!!busy} className={`${btn} bg-white text-black`}
            onClick={() => act("Criando robôs…", async () => { await simCreate(n); setBots((b) => b + Math.min(n, 70)); })}>+ Criar robôs</button>
          <button disabled={!!busy || bots === 0} className={`${btn} border border-red-400/60 text-red-200`}
            onClick={() => confirm("Apagar todos os robôs e tudo que eles mandaram?") && act("Apagando…", async () => { setRunning(false); await simClear(); setBots(0); setSt(null); })}>
            Apagar robôs
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-white/5 p-4">
        <h2 className="font-bold">2. Jogar</h2>
        <label className="flex items-center gap-3 text-sm">
          Ritmo: <input type="range" min={1} max={30} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <span className="text-muted">{speed} ações a cada 2s {speed <= 5 ? "(gente calma)" : speed >= 20 ? "(turbo)" : ""}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {st?.phase === "lobby" && <button disabled={!!busy} className={`${btn} bg-emerald-400 text-black`} onClick={() => act("Largada!", async () => { await startGame(); })}>🚀 Dar a largada</button>}
          <button disabled={bots === 0} onClick={() => setRunning((r) => !r)} className={`${btn} ${running ? "bg-white/15" : "bg-accent text-black"}`}>
            {running ? "⏸ Pausar robôs" : "▶ Robôs, joguem!"}
          </button>
        </div>
        {st && (
          <div className="space-y-2 text-sm">
            <p>Fase: <b className="text-accent">{PHASE[st.phase]}</b></p>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-[#6b7cff] to-[#3ee08f] transition-all" style={{ width: `${(st.greens / Math.max(1, st.total)) * 100}%` }} />
            </div>
            <p className="text-muted">{st.greens}/{st.total} planetas verdes{st.phase === "capsule" && " · robôs escrevendo cápsulas… agora é com você: 🎬 Grande revelação na Torre"}</p>
          </div>
        )}
        {running && !st && <p className="text-sm text-muted">Conectando…</p>}
      </section>
      {busy && <p className="animate-pulse text-sm">{busy}</p>}
      <p className="text-xs text-muted">Dica: depois do ensaio, use <b>🔁 Recomeçar o jogo</b> na Torre de controle e <b>Apagar robôs</b> aqui.</p>
    </div>
  );
}
