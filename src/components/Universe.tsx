"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { energyColor, isGreen, level } from "@/lib/colors";
import type { Comet, Game, Planet } from "@/lib/types";
import CapsuleForm from "./CapsuleForm";
import Inbox from "./Inbox";

type Me = { id: string; nickname: string; isModerator: boolean; hasCapsule: boolean };
const W = 1000;

/** Missões: mistura quem ainda precisa de energia com sorteados. Ninguém é rotulado como "o mais fraco". */
function pickMissions(planets: Planet[], comets: Comet[], me: string, greenAt: number, seed: number) {
  const visited = new Set(comets.filter((c) => c.from_id === me).map((c) => c.to_id));
  const pool = planets.filter((p) => p.id !== me && !visited.has(p.id));
  const rnd = (i: number) => ((Math.sin(seed * 9301 + i * 49297) + 1) * 10000) % 1;
  const shuffled = pool.map((p, i) => ({ p, r: rnd(i) })).sort((a, b) => a.r - b.r).map((x) => x.p);
  // 2 vagas para quem mais precisa (sorteadas entre os 6 com menos energia) + 1 vaga totalmente aleatória
  const needyIds = new Set(
    [...pool].filter((p) => !isGreen(p.energy, greenAt)).sort((a, b) => a.energy - b.energy).slice(0, 6).map((p) => p.id),
  );
  const picks = [...shuffled.filter((p) => needyIds.has(p.id)).slice(0, 2), ...shuffled];
  return [...new Map(picks.map((p) => [p.id, p])).values()].slice(0, 3);
}

export default function Universe({ me, initialPlanets, initialComets, initialGame }: { me: Me; initialPlanets: Planet[]; initialComets: Comet[]; initialGame: Game }) {
  const router = useRouter();
  const [planets, setPlanets] = useState(initialPlanets);
  const [comets, setComets] = useState(initialComets);
  const [game, setGame] = useState(initialGame);
  const [flying, setFlying] = useState<Comet[]>([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [hasCapsule, setHasCapsule] = useState(me.hasCapsule);
  const [seed, setSeed] = useState(1);
  const [hideFinale, setHideFinale] = useState(false);

  // Polling leve (a cada 3s) no retrato cacheado do universo. Cometas novos "voam" na tela.
  useEffect(() => {
    let alive = true;
    const seen = new Set(initialComets.map((c) => c.id));
    async function tick() {
      try {
        const r = await fetch("/api/universe");
        if (!r.ok || !alive) return;
        const j = (await r.json()) as { game: Game; planets: Planet[]; comets: Comet[] };
        setGame((g) => ({ ...g, ...j.game }));
        setPlanets(j.planets);
        const fresh = j.comets.filter((c) => !seen.has(c.id));
        if (fresh.length) {
          fresh.forEach((c) => seen.add(c.id));
          setComets((cs) => [...fresh, ...cs]);
          setFlying((f) => [...f, ...fresh.slice(-12)]);
          setTimeout(() => setFlying((f) => f.filter((x) => !fresh.some((n) => n.id === x.id))), 2600);
        }
      } catch { /* rede oscilou: tenta de novo no próximo tick */ }
    }
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [initialComets]);

  const byId = useMemo(() => new Map(planets.map((p) => [p.id, p])), [planets]);
  const edges = useMemo(() => {
    const m = new Map<string, { a: string; b: string; n: number }>();
    for (const c of comets) {
      const [a, b] = [c.from_id, c.to_id].sort();
      const k = `${a}|${b}`;
      m.set(k, { a, b, n: (m.get(k)?.n ?? 0) + 1 });
    }
    return [...m.values()];
  }, [comets]);
  const mine = byId.get(me.id);
  const lvl = level(mine?.xp ?? 0);
  const greens = planets.filter((p) => isGreen(p.energy, game.green_at)).length;
  const aboard = planets.filter((p) => p.lit_at).length;
  const missions = useMemo(() => pickMissions(planets, comets, me.id, game.green_at, seed), [planets, comets, me.id, game.green_at, seed]);
  const pos = (p: Planet) => ({ x: p.x * W, y: p.y * W });
  const go = (p: Planet) => router.push(p.id === me.id ? "/eu" : `/planeta/${p.id}`);

  return (
    <main className="fixed inset-0 flex flex-col">
      <header className="z-10 space-y-2 p-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="flex items-center justify-between gap-2">
          <Link href="/eu" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full text-lg font-black text-black" style={{ background: energyColor(mine?.energy ?? 0, game.green_at) }}>{lvl.n}</span>
            <span className="leading-tight"><b>{lvl.name}</b><br /><span className="text-xs text-accent">{mine?.xp ?? 0} XP</span></span>
          </Link>
          <div className="flex gap-2">
            {me.isModerator && <Link href="/admin" className="rounded-full border border-white/20 px-3 py-2 text-sm">🛡️</Link>}
            <button onClick={() => setInboxOpen(true)} className="whitespace-nowrap rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">Recebidos</button>
          </div>
        </div>
        {game.phase === "lobby" ? (
          <p className="rounded-2xl bg-white/5 p-3 text-center">🛸 <b className="text-accent">{aboard}</b> de {planets.length} a bordo. A largada é já já!</p>
        ) : (
          <div>
            <div className="mb-1 flex justify-between text-sm"><span>Missão do time: <b>todos os planetas verdes</b></span><b className="text-accent">{greens}/{planets.length}</b></div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-[#6b7cff] via-[#4fd1c5] to-[#3ee08f]" animate={{ width: `${(greens / Math.max(1, planets.length)) * 100}%` }} />
            </div>
          </div>
        )}
      </header>

      <div className="relative flex-1 overflow-auto">
        <svg viewBox={`-50 -50 ${W + 100} ${W + 100}`} className="mx-auto block h-full min-h-[560px] w-full max-w-3xl touch-manipulation">
          <defs>
            <radialGradient id="glow"><stop offset="0%" stopColor="#fff" stopOpacity=".55" /><stop offset="100%" stopColor="#fff" stopOpacity="0" /></radialGradient>
          </defs>
          {edges.map((e) => {
            const a = byId.get(e.a), b = byId.get(e.b);
            if (!a || !b) return null;
            const touchesMe = e.a === me.id || e.b === me.id;
            return <line key={`${e.a}${e.b}`} x1={pos(a).x} y1={pos(a).y} x2={pos(b).x} y2={pos(b).y}
              stroke={touchesMe ? "#ffcf5a" : "#fff"} strokeOpacity={Math.min(0.1 + e.n * 0.06, touchesMe ? 0.75 : 0.35)} strokeWidth={Math.min(1 + e.n * 0.4, 4)} />;
          })}
          {flying.map((c) => {
            const a = byId.get(c.from_id), b = byId.get(c.to_id);
            if (!a || !b) return null;
            return <motion.circle key={c.id} r={8} fill="#ffcf5a" style={{ filter: "drop-shadow(0 0 8px #ffcf5a)" }}
              initial={{ cx: pos(a).x, cy: pos(a).y, opacity: 1 }} animate={{ cx: pos(b).x, cy: pos(b).y, opacity: [1, 1, 0] }} transition={{ duration: 2.4, ease: "easeInOut" }} />;
          })}
          {planets.map((p) => {
            const isMe = p.id === me.id;
            const green = isGreen(p.energy, game.green_at);
            const r = 30 * (p.size || 1) * (1 + Math.min(p.energy / game.green_at, 1) * 0.25);   // cresce com a energia
            const { x, y } = pos(p);
            const fill = energyColor(p.energy, game.green_at);
            return (
              <g key={p.id} onClick={() => go(p)} className="cursor-pointer">
                <circle cx={x} cy={y} r={r * (green ? 2.8 : 2)} fill="url(#glow)" opacity={green ? 0.8 : 0.35} />
                <motion.circle cx={x} cy={y} r={r} fill={fill} stroke={isMe ? "#ffcf5a" : "transparent"} strokeWidth={5}
                  animate={{ scale: green ? [1, 1.12, 1] : [1, 1.04, 1] }} transition={{ repeat: Infinity, duration: green ? 1.6 : 3 + p.x * 3 }}
                  style={{ transformOrigin: `${x}px ${y}px` }} />
                <ellipse cx={x} cy={y} rx={r * 1.6} ry={r * 0.45} fill="none" stroke="#ffffff66" strokeWidth={2} transform={`rotate(-18 ${x} ${y})`} />
                {green && <text x={x + r * 0.9} y={y - r * 0.8} fontSize={22}>✨</text>}
                {!p.lit_at && game.phase === "lobby" && <text x={x} y={y + 8} textAnchor="middle" fontSize={20} opacity={0.7}>💤</text>}
                <text x={x} y={y + r + 28} textAnchor="middle" fontSize={24} fill="#eef0ff" fontWeight={isMe ? 800 : 500}>{isMe ? "você" : p.nickname}</text>
              </g>
            );
          })}
        </svg>
      </div>

      {game.phase === "playing" && missions.length > 0 && (
        <div className="z-10 px-4 pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="mb-1 flex items-center justify-between text-xs text-muted">
            <span>🎯 Missões: visite e ganhe XP em dobro em quem ainda não tá verde</span>
            <button onClick={() => setSeed((s) => s + 1)} className="underline">trocar</button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {missions.map((p) => (
              <button key={p.id} onClick={() => go(p)} className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: energyColor(p.energy, game.green_at) }} /> {p.nickname}
              </button>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {inboxOpen && <Inbox key="i" onClose={() => setInboxOpen(false)} />}
        {game.phase === "capsule" && (
          <motion.div key="cap" className="fixed inset-0 z-40 overflow-y-auto bg-space/95 p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mx-auto max-w-md space-y-4 py-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{ type: "spring" }} className="text-7xl">💚</motion.div>
              <h1 className="text-3xl font-black">TODOS OS {planets.length} PLANETAS VERDES!</h1>
              <p className="text-muted">Missão cumprida, tripulação. Antes da grande revelação, uma última tarefa…</p>
              {hasCapsule
                ? <p className="rounded-2xl bg-white/5 p-4">💌 Sua cápsula está lacrada. Aguarde a revelação no telão!</p>
                : <CapsuleForm onDone={() => setHasCapsule(true)} />}
            </div>
          </motion.div>
        )}
        {game.phase === "finale" && !hideFinale && (
          <motion.div key="fin" className="fixed inset-0 z-40 grid place-items-center bg-space/95 p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-5">
              <div className="text-7xl">🎬</div>
              <h1 className="text-3xl font-black">Seu filme está pronto</h1>
              <Link href="/final" className="inline-block rounded-full bg-accent px-8 py-4 text-lg font-black text-black">Assistir ▶</Link>
              <div className="flex justify-center gap-4 text-sm">
                <Link href="/final/time" className="underline">filme do time</Link>
                <button onClick={() => setHideFinale(true)} className="underline">ver a constelação</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
