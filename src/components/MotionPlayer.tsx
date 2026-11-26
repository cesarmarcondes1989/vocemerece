"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

export type Slide = { key: string; duration: number; bg?: string; content: React.ReactNode };

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as const },
});

/** Player estilo stories: toque à direita avança, à esquerda volta, segurar pausa. O último slide fica parado. */
export default function MotionPlayer({ slides }: { slides: Slide[] }) {
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
    <main className="fixed inset-0 select-none overflow-hidden"
      onPointerDown={() => setPaused(true)}
      onPointerUp={(e) => { setPaused(false); if ((e.target as HTMLElement).closest("a,button")) return; (e.clientX < window.innerWidth / 3 ? prev : next)(); }}>
      <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3 pt-[max(env(safe-area-inset-top),12px)]">
        {slides.map((s, k) => (
          <div key={s.key} className="h-1 flex-1 overflow-hidden rounded bg-white/20">
            {(k < i || (k === i && k === slides.length - 1)) && <div className="h-full w-full bg-white" />}
            {k === i && k < slides.length - 1 && (
              <motion.div key={`${s.key}-bar`} className="h-full bg-white" initial={{ width: 0 }}
                animate={{ width: paused ? undefined : "100%" }} transition={{ duration: s.duration / 1000, ease: "linear" }} />
            )}
          </div>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.section key={slide.key} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
          {slide.bg && (
            <>
              <motion.img src={slide.bg} alt="" className="absolute inset-0 h-full w-full object-cover" initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: slide.duration / 1000 }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </>
          )}
          <div className="relative mx-auto flex h-full max-w-xl flex-col items-center justify-center gap-5 px-7 py-20 text-center">{slide.content}</div>
        </motion.section>
      </AnimatePresence>
    </main>
  );
}
