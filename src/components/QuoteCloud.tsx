"use client";
import { motion } from "framer-motion";

type Q = { text: string; from?: string };

// pseudo-aleatório estável por índice (mesmo layout a cada render), entre -1 e 1
const rnd = (i: number, k: number) => (Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
const COLORS = ["#ffcf5a", "#eef0ff", "#7ce0a3", "#9ad7ff", "#ffb4d9", "#c7b8ff"];

/** Nuvem de frases (no celular mostra só as 8 primeiras, para caber): aparecem rapidinho, espalhadas pela tela, em tamanhos/inclinações diferentes, flutuando. */
export default function QuoteCloud({ items, title }: { items: Q[]; title?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      {title && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm uppercase tracking-[0.25em] text-muted">{title}</motion.p>}
      <div className="grid w-full grid-cols-2 items-center gap-x-3 gap-y-5 md:grid-cols-4">
        {items.map((q, i) => {
          const len = q.text.length;
          const size = (len < 30 ? 1.5 : len < 60 ? 1.15 : 0.95) * (0.9 + Math.abs(rnd(i, 1)) * 0.3);
          const rot = rnd(i, 2) * 7;
          const dx = rnd(i, 5) * 22, dy = rnd(i, 6) * 14;
          return (
            <motion.div key={i} style={{ x: dx, color: COLORS[i % COLORS.length], fontSize: `${size}rem` }}
              initial={{ opacity: 0, scale: 0.2, rotate: rot * 4 }}
              animate={{ opacity: 1, scale: 1, rotate: rot, y: [dy, dy - 8 - Math.abs(rnd(i, 3)) * 8, dy] }}
              transition={{
                opacity: { delay: 0.1 + i * 0.09, duration: 0.25 },
                scale: { delay: 0.1 + i * 0.09, type: "spring", damping: 11, stiffness: 200 },
                rotate: { delay: 0.1 + i * 0.09, type: "spring", damping: 11 },
                y: { delay: 0.5, duration: 2.5 + Math.abs(rnd(i, 4)) * 2, repeat: Infinity, ease: "easeInOut" },
              }}
              className={`justify-self-center font-semibold leading-snug drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] ${i >= 8 ? "hidden md:block" : ""}`}>
              “{q.text}”
              {q.from && <span className="mt-0.5 block text-[0.6em] font-normal text-muted">— {q.from}</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
