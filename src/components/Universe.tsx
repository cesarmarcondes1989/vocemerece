"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { browserDb } from "@/lib/supabase-browser";
import type { Comet, Planet } from "@/lib/types";
import Composer from "./Composer";
import Consent from "./Consent";
import Inbox from "./Inbox";

type Me = { id: string; nickname: string; consented: boolean; isModerator: boolean };
const W = 1000;

export default function Universe({ me, initialPlanets, initialComets }: { me: Me; initialPlanets: Planet[]; initialComets: Comet[] }) {
  const [planets, setPlanets] = useState(initialPlanets);
  const [comets, setComets] = useState(initialComets);
  const [flying, setFlying] = useState<Comet[]>([]);
  const [target, setTarget] = useState<Planet | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [consented, setConsented] = useState(me.consented);

  // Realtime: planetas acendendo e cometas cruzando o céu, ao vivo para todo mundo
  useEffect(() => {
    const ch = browserDb()
      .channel("universo")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "planets" }, ({ new: p }) =>
        setPlanets((ps) => ps.map((x) => (x.id === (p as Planet).id ? (p as Planet) : x))))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comets" }, ({ new: c }) => {
        const comet = c as Comet;
        setComets((cs) => [comet, ...cs]);
        setFlying((f) => [...f, comet]);
        setTimeout(() => setFlying((f) => f.filter((x) => x.id !== comet.id)), 2600);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comets" }, ({ old }) =>
        setComets((cs) => cs.filter((x) => x.id !== (old as Comet).id)))
      .subscribe();
    return () => { browserDb().removeChannel(ch); };
  }, []);

  const byId = useMemo(() => new Map(planets.map((p) => [p.id, p])), [planets]);
  // constelação: uma linha por par de pessoas que trocaram cometas (mais cometas = mais forte)
  const edges = useMemo(() => {
    const m = new Map<string, { a: string; b: string; n: number }>();
    for (const c of comets) {
      const [a, b] = [c.from_id, c.to_id].sort();
      const k = `${a}|${b}`;
      m.set(k, { a, b, n: (m.get(k)?.n ?? 0) + 1 });
    }
    return [...m.values()];
  }, [comets]);
  const lit = planets.filter((p) => p.lit_at).length;
  const pos = (p: Planet) => ({ x: p.x * W, y: p.y * W });

  return (
    <main className="fixed inset-0 flex flex-col">
      <header className="z-10 flex items-center justify-between gap-2 p-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Universo 2026</p>
          <p className="font-semibold"><span className="text-accent">{lit}</span> de {planets.length} planetas acesos · {comets.length} ☄️</p>
        </div>
        <div className="flex gap-2">
          {me.isModerator && <Link href="/admin" className="rounded-full border border-white/20 px-3 py-2 text-sm">🛡️</Link>}
          <button onClick={() => setInboxOpen(true)} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
            Meus cometas
          </button>
        </div>
      </header>

      <div className="relative flex-1 overflow-auto">
        <svg viewBox={`-40 -40 ${W + 80} ${W + 80}`} className="mx-auto block h-full min-h-[600px] w-full max-w-3xl touch-manipulation">
          <defs>
            <radialGradient id="glow"><stop offset="0%" stopColor="#fff" stopOpacity=".6" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
          </defs>

          {edges.map((e) => {
            const a = byId.get(e.a), b = byId.get(e.b);
            if (!a || !b) return null;
            const touchesMe = e.a === me.id || e.b === me.id;
            return (
              <line key={`${e.a}${e.b}`} x1={pos(a).x} y1={pos(a).y} x2={pos(b).x} y2={pos(b).y}
                stroke={touchesMe ? "#ffcf5a" : "#ffffff"} strokeOpacity={Math.min(0.12 + e.n * 0.08, touchesMe ? 0.8 : 0.45)}
                strokeWidth={Math.min(1 + e.n * 0.5, 4)} />
            );
          })}

          {flying.map((c) => {
            const a = byId.get(c.from_id), b = byId.get(c.to_id);
            if (!a || !b) return null;
            return (
              <motion.circle key={c.id} r={7} fill="#ffcf5a" style={{ filter: "drop-shadow(0 0 8px #ffcf5a)" }}
                initial={{ cx: pos(a).x, cy: pos(a).y, opacity: 1 }} animate={{ cx: pos(b).x, cy: pos(b).y, opacity: [1, 1, 0] }}
                transition={{ duration: 2.4, ease: "easeInOut" }} />
            );
          })}

          {planets.map((p) => {
            const isMe = p.id === me.id;
            const r = 30 * (p.size || 1);
            const { x, y } = pos(p);
            return (
              <g key={p.id} onClick={() => !isMe && setTarget(p)} className={isMe ? "" : "cursor-pointer"}>
                {p.lit_at && <circle cx={x} cy={y} r={r * 2.4} fill="url(#glow)" opacity={0.5} />}
                <motion.circle cx={x} cy={y} r={r} fill={p.lit_at ? p.color : "#2a2d45"}
                  stroke={isMe ? "#ffcf5a" : "transparent"} strokeWidth={4}
                  animate={p.lit_at ? { scale: [1, 1.06, 1] } : {}} transition={{ repeat: Infinity, duration: 3 + (p.x * 3) }}
                  style={{ transformOrigin: `${x}px ${y}px` }} />
                <ellipse cx={x} cy={y} rx={r * 1.6} ry={r * 0.45} fill="none" stroke={p.lit_at ? "#ffffff66" : "#ffffff18"}
                  strokeWidth={2} transform={`rotate(-18 ${x} ${y})`} />
                <text x={x} y={y + r + 28} textAnchor="middle" fontSize={24} fill={p.lit_at ? "#eef0ff" : "#6b7095"} fontWeight={isMe ? 700 : 500}>
                  {isMe ? "você" : p.nickname}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="pb-[max(env(safe-area-inset-bottom),12px)] text-center text-sm text-muted">Toque num planeta para mandar um cometa ☄️</p>

      <AnimatePresence>
        {target && consented && <Composer key="c" target={target} onClose={() => setTarget(null)} />}
        {target && !consented && <Consent key="k" onDone={() => setConsented(true)} onClose={() => setTarget(null)} />}
        {inboxOpen && <Inbox key="i" onClose={() => setInboxOpen(false)} />}
      </AnimatePresence>
    </main>
  );
}
