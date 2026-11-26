"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";
import type { PersonalFinale } from "@/lib/finale";
import MotionPlayer, { fadeUp, type Slide } from "./MotionPlayer";

const Big = ({ n, label, d = 0 }: { n: number | string; label: string; d?: number }) => (
  <motion.div {...fadeUp(d)}><div className="text-6xl font-black text-accent">{n}</div><div className="text-lg">{label}</div></motion.div>
);

export default function PersonalMotion({ data }: { data: PersonalFinale }) {
  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];
    const r = data.received;
    s.push({ key: "intro", duration: 4500, content: <>
      <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", duration: 1.2 }} className="text-8xl">💚</motion.div>
      <motion.h1 {...fadeUp(0.6)} className="text-4xl font-black">{data.nickname}, seu planeta ficou verde.</motion.h1>
      <motion.p {...fadeUp(1.2)} className="text-xl text-muted">E não foi por acaso. Olha o que o time mandou pra você 👇</motion.p>
    </> });
    s.push({ key: "nums", duration: 6000, content: <div className="grid gap-6">
      <Big n={r.senders} label="pessoas visitaram seu planeta" />
      <Big n={r.total} label="cometas, reações e comentários" d={0.5} />
      {r.photos > 0 && <Big n={r.photos} label={r.photos === 1 ? "foto juntos" : "fotos juntos"} d={1} />}
    </div> });
    if (data.aiLine) s.push({ key: "ai", duration: 6000, content: <>
      <motion.p {...fadeUp()} className="text-sm uppercase tracking-widest text-accent">Se o time pudesse resumir você</motion.p>
      <motion.p {...fadeUp(0.5)} className="text-3xl font-bold leading-snug">{data.aiLine}</motion.p>
    </> });
    data.quotes.slice(0, 8).forEach((q, i) => s.push({ key: `q${i}`, duration: Math.min(9000, 3500 + q.text.length * 40), content: <>
      <motion.p {...fadeUp(0.2)} className="text-3xl font-semibold leading-snug">“{q.text}”</motion.p>
      <motion.p {...fadeUp(0.9)} className="text-lg text-accent">— {q.from}</motion.p>
    </> }));
    if (data.quotes.length > 8) s.push({ key: "more", duration: 4000, content: <motion.p {...fadeUp()} className="text-2xl">…e mais <b className="text-accent">{data.quotes.length - 8}</b> recados esperando por você em “Recebidos” 💌</motion.p> });
    if (data.stickers.length) s.push({ key: "st", duration: 5000, content: <>
      <motion.p {...fadeUp()} className="text-muted">Os títulos que te deram</motion.p>
      {data.stickers.slice(0, 4).map((st, i) => (
        <motion.p key={st.label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + i * 0.4, type: "spring" }} className="text-3xl font-bold">
          {st.emoji} {st.label}{st.count > 1 && <span className="text-accent"> ×{st.count}</span>}
        </motion.p>
      ))}
    </> });
    data.photos.slice(0, 3).forEach((url, i) => s.push({ key: `ph${i}`, duration: 4500, bg: url, content: <motion.p {...fadeUp(0.5)} className="mt-auto text-2xl font-bold">📸 Memória de 2026</motion.p> }));
    s.push({ key: "you", duration: 6000, content: <>
      <motion.p {...fadeUp()} className="text-muted">E você também espalhou energia</motion.p>
      <Big n={data.given.visited} label="planetas visitados" d={0.4} />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1.2, type: "spring" }} className="rounded-3xl bg-white/10 px-6 py-4">
        <div className="text-5xl">{data.persona.emoji}</div><div className="text-2xl font-black">{data.persona.title}</div>
      </motion.div>
    </> });
    if (data.awards.length) s.push({ key: "award", duration: 7000, content: <>
      <motion.div animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-8xl">🏆</motion.div>
      <motion.p {...fadeUp(0.3)} className="text-lg text-muted">E tem mais. Você é…</motion.p>
      {data.awards.map((a, i) => <motion.h2 key={a} {...fadeUp(1 + i * 0.6)} className="text-4xl font-black text-accent">{a}</motion.h2>)}
    </> });
    s.push({ key: "end", duration: 999999, content: <>
      <motion.p {...fadeUp()} className="text-2xl leading-snug">Obrigado por tudo que você fez em 2026.</motion.p>
      <motion.h2 {...fadeUp(0.8)} className="text-4xl font-black text-accent">A gente conta com você em 2027. 🪐</motion.h2>
      <motion.div {...fadeUp(1.6)} className="flex flex-col gap-3">
        <Link href="/final/time" className="rounded-full bg-accent px-7 py-4 text-lg font-black text-black">Ver o filme do time 🎬</Link>
        <Link href="/universo" className="text-sm underline">voltar ao universo</Link>
      </motion.div>
    </> });
    return s;
  }, [data]);
  return <MotionPlayer slides={slides} />;
}
