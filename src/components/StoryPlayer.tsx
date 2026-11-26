"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Story } from "@/lib/types";

type Slide = { key: string; duration: number; render: () => React.ReactNode; bg?: string };

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
});

export default function StoryPlayer({ nickname, story, preview = false }: { nickname: string; story: Story; preview?: boolean }) {
  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];
    s.push({
      key: "intro", duration: 4500,
      render: () => (
        <>
          <motion.div {...fadeUp()} className="text-8xl">🪐</motion.div>
          <motion.h1 {...fadeUp(0.4)} className="text-4xl font-bold">Oi, {nickname}.</motion.h1>
          <motion.p {...fadeUp(1)} className="text-xl text-muted">Esse planeta é seu.<br />Ele guardou um pouco do seu 2026.</motion.p>
        </>
      ),
    });
    if (story.headline)
      s.push({
        key: "headline", duration: 4500,
        render: () => <motion.h2 {...fadeUp()} className="text-4xl font-bold leading-tight">{story.headline}</motion.h2>,
      });
    (story.moments ?? []).forEach((m, i) =>
      s.push({
        key: `m${i}`, duration: 6500, bg: m.photo,
        render: () => (
          <div className="mt-auto w-full text-left">
            <motion.p {...fadeUp()} className="text-sm uppercase tracking-widest text-accent">Momento {i + 1}</motion.p>
            <motion.h3 {...fadeUp(0.2)} className="text-3xl font-bold">{m.title}</motion.h3>
            <motion.p {...fadeUp(0.5)} className="mt-2 text-lg text-ink/90">{m.text}</motion.p>
          </div>
        ),
      }),
    );
    if (story.numbers?.length)
      s.push({
        key: "numbers", duration: 6000,
        render: () => (
          <div className="grid w-full gap-6">
            <motion.p {...fadeUp()} className="text-muted">Seu ano em números</motion.p>
            {story.numbers!.map((n, i) => (
              <motion.div key={i} {...fadeUp(0.3 + i * 0.4)}>
                <div className="text-6xl font-black text-accent">{n.value}</div>
                <div className="text-lg">{n.label}</div>
              </motion.div>
            ))}
          </div>
        ),
      });
    if (story.words?.length)
      s.push({
        key: "words", duration: 5000,
        render: () => (
          <>
            <motion.p {...fadeUp()} className="text-muted">Se o time te descrevesse em 3 palavras…</motion.p>
            {story.words!.map((w, i) => (
              <motion.div key={w} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.6, type: "spring" }} className="text-5xl font-black">{w}</motion.div>
            ))}
          </>
        ),
      });
    (story.quotes ?? []).forEach((q, i) =>
      s.push({
        key: `q${i}`, duration: 5500,
        render: () => (
          <>
            <motion.p {...fadeUp()} className="text-muted">O que dizem por aí</motion.p>
            <motion.blockquote {...fadeUp(0.3)} className="text-3xl font-semibold leading-snug">“{q.text}”</motion.blockquote>
            <motion.p {...fadeUp(0.9)} className="text-accent">— {q.from}</motion.p>
          </>
        ),
      }),
    );
    s.push({
      key: "thanks", duration: 999999,
      render: () => (
        <>
          <motion.p {...fadeUp()} className="text-2xl leading-snug">{story.thanks ?? "Obrigado por tudo que você fez em 2026."}</motion.p>
          <motion.h2 {...fadeUp(1)} className="text-4xl font-black text-accent">A gente conta com você em 2027.</motion.h2>
          {!preview && (
            <motion.div {...fadeUp(2)}>
              <Link href="/universo" onClick={(e) => e.stopPropagation()}
                className="inline-block rounded-full bg-accent px-7 py-4 text-lg font-bold text-black shadow-[0_0_40px_#ffcf5a88]">
                Entrar no universo 🚀
              </Link>
            </motion.div>
          )}
        </>
      ),
    });
    return s;
  }, [nickname, story, preview]);

  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = useCallback(() => setI((v) => Math.min(v + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    if (paused || i === slides.length - 1) return;
    const t = setTimeout(next, slides[i].duration);
    return () => clearTimeout(t);
  }, [i, paused, next, slides]);

  const slide = slides[i];
  return (
    <main
      className="fixed inset-0 select-none overflow-hidden"
      onPointerDown={() => setPaused(true)}
      onPointerUp={(e) => {
        setPaused(false);
        (e.clientX < window.innerWidth / 3 ? prev : next)();
      }}
    >
      {/* barras de progresso estilo stories */}
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[max(env(safe-area-inset-top),12px)]">
        {slides.map((s, k) => (
          <div key={s.key} className="h-1 flex-1 overflow-hidden rounded bg-white/20">
            {k < i && <div className="h-full w-full bg-white" />}
            {k === i && k < slides.length - 1 && (
              <motion.div key={`${s.key}-bar`} className="h-full bg-white" initial={{ width: 0 }}
                animate={{ width: paused ? undefined : "100%" }} transition={{ duration: s.duration / 1000, ease: "linear" }} />
            )}
            {k === i && k === slides.length - 1 && <div className="h-full w-full bg-white" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={slide.key} className="absolute inset-0"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {slide.bg && (
            <>
              <motion.img src={slide.bg} alt="" className="absolute inset-0 h-full w-full object-cover"
                initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: slide.duration / 1000 }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </>
          )}
          <div className="relative mx-auto flex h-full max-w-md flex-col items-center justify-center gap-5 px-7 py-20 text-center">
            {slide.render()}
          </div>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}
