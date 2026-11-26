"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import type { Comet, GameStats, Planet } from "@/lib/types";
import MotionPlayer, { fadeUp, type Slide } from "./MotionPlayer";

/** A constelação final: todas as conexões do jogo desenhadas de uma vez. */
function Constellation({ planets, comets }: { planets: Planet[]; comets: Pick<Comet, "from_id" | "to_id">[] }) {
  const by = new Map(planets.map((p) => [p.id, p]));
  const edges = [...new Set(comets.map((c) => [c.from_id, c.to_id].sort().join("|")))].map((k) => k.split("|"));
  return (
    <svg viewBox="-40 -40 1080 1080" className="h-[60vh] w-full">
      {edges.map(([a, b], i) => {
        const A = by.get(a), B = by.get(b);
        if (!A || !B) return null;
        return <motion.line key={i} x1={A.x * 1000} y1={A.y * 1000} x2={B.x * 1000} y2={B.y * 1000} stroke="#3ee08f" strokeOpacity={0.35} strokeWidth={1.5}
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: (i % 200) * 0.015, duration: 1 }} />;
      })}
      {planets.map((p, i) => (
        <motion.circle key={p.id} cx={p.x * 1000} cy={p.y * 1000} r={16} fill="#3ee08f" initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5 + i * 0.03, type: "spring" }} style={{ transformOrigin: `${p.x * 1000}px ${p.y * 1000}px`, filter: "drop-shadow(0 0 10px #3ee08f)" }} />
      ))}
    </svg>
  );
}

export default function TeamMotion({ stats, planets, comets }: { stats: GameStats; planets: Planet[]; comets: Pick<Comet, "from_id" | "to_id">[] }) {
  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];
    s.push({ key: "intro", duration: 5000, content: <>
      <motion.p {...fadeUp()} className="text-sm uppercase tracking-[0.3em] text-accent">Universo 2026 · o filme do time</motion.p>
      <motion.h1 {...fadeUp(0.6)} className="text-5xl font-black leading-tight">{stats.headline}</motion.h1>
    </> });
    s.push({ key: "time", duration: 5500, content: <>
      <motion.p {...fadeUp()} className="text-2xl">Em <b className="text-accent">{stats.minutes} minutos</b>,</motion.p>
      <motion.p {...fadeUp(0.6)} className="text-2xl"><b className="text-accent">{stats.people} planetas</b> ficaram verdes.</motion.p>
      <motion.p {...fadeUp(1.4)} className="text-muted">Ninguém ficou pra trás. 💚</motion.p>
    </> });
    s.push({ key: "nums", duration: 7000, content: <div className="grid grid-cols-2 gap-6">
      {([["reaction", "reações"], ["comment", "comentários"], ["text", "mensagens"], ["sticker", "títulos"], ["photo", "fotos juntos"]] as const)
        .filter(([k]) => stats.totals[k] > 0)
        .map(([k, l], i) => (
          <motion.div key={k} {...fadeUp(i * 0.35)}><div className="text-5xl font-black text-accent">{stats.totals[k].toLocaleString("pt-BR")}</div><div>{l}</div></motion.div>
        ))}
    </div> });
    s.push({ key: "web", duration: 8000, content: <>
      <motion.p {...fadeUp()} className="text-xl"><b className="text-accent">{stats.pairs}</b> conexões entre pessoas</motion.p>
      <Constellation planets={planets} comets={comets} />
      <motion.p {...fadeUp(2)} className="text-xl"><b className="text-accent">{stats.connectedPct}%</b> de todas as duplas possíveis do time trocaram carinho</motion.p>
    </> });
    if (stats.themes.length) s.push({ key: "themes", duration: 6000, content: <>
      <motion.p {...fadeUp()} className="text-muted">O que mais se falou</motion.p>
      <div className="flex flex-wrap justify-center gap-3">
        {stats.themes.map((t, i) => (
          <motion.span key={t} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.25, type: "spring" }}
            className="rounded-full bg-white/10 px-4 py-2 font-bold" style={{ fontSize: `${1.6 - i * 0.08}rem` }}>{t}</motion.span>
        ))}
      </div>
    </> });
    stats.highlights.forEach((h, i) => s.push({ key: `h${i}`, duration: Math.min(8000, 3500 + h.length * 40), content: <>
      <motion.p {...fadeUp()} className="text-sm uppercase tracking-widest text-muted">alguém escreveu</motion.p>
      <motion.p {...fadeUp(0.4)} className="text-3xl font-semibold leading-snug">“{h}”</motion.p>
    </> }));
    if (stats.explorer) s.push({ key: "explorer", duration: 7000, content: <>
      <motion.div {...fadeUp()} className="text-8xl">🧭</motion.div>
      <motion.p {...fadeUp(0.4)} className="text-muted">Explorador(a) Intergaláctico(a)</motion.p>
      <motion.h2 initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring" }} className="text-6xl font-black text-accent">{stats.explorer.nickname}</motion.h2>
      <motion.p {...fadeUp(1.8)}>visitou <b>{stats.explorer.visited}</b> planetas</motion.p>
    </> });
    if (stats.sun) s.push({ key: "sun", duration: 7000, content: <>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="text-8xl">☀️</motion.div>
      <motion.p {...fadeUp(0.4)} className="text-muted">Sol do Time</motion.p>
      <motion.h2 initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring" }} className="text-6xl font-black text-accent">{stats.sun.nickname}</motion.h2>
      <motion.p {...fadeUp(1.8)}>quem mais recebeu carinho do time</motion.p>
    </> });
    if (stats.topGivers.length) s.push({ key: "givers", duration: 6000, content: <>
      <motion.p {...fadeUp()} className="text-muted">Quem mais espalhou energia</motion.p>
      {stats.topGivers.map((g, i) => <motion.p key={g.nickname} {...fadeUp(0.5 + i * 0.5)} className="text-3xl font-bold">{["🥇", "🥈", "🥉"][i]} {g.nickname} <span className="text-accent">{g.xp} XP</span></motion.p>)}
    </> });
    s.push({ key: "end", duration: 999999, content: <>
      <motion.p {...fadeUp()} className="text-2xl">Um time que se vê, se escuta e se celebra.</motion.p>
      <motion.h2 {...fadeUp(0.8)} className="text-5xl font-black text-accent">Bora 2027. Juntos. 🪐</motion.h2>
      <motion.div {...fadeUp(1.6)}><Link href="/final" className="text-sm underline">rever meu filme</Link></motion.div>
    </> });
    return s;
  }, [stats, planets, comets]);
  return <MotionPlayer slides={slides} />;
}
