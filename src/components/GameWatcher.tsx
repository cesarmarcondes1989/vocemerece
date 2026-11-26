"use client";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MSG: Record<string, string> = {
  playing: "🚀 Largada! O jogo começou",
  capsule: "💚 Todos os planetas verdes! Hora da cápsula",
  finale: "🎬 Seus filmes estão prontos!",
  lobby: "🛸 O jogo voltou para o lobby",
};

/**
 * Vigia a fase do jogo em todas as páginas do jogador. Quando muda:
 * cápsula/final → leva para o /universo (onde aparece a tela certa); outras mudanças → atualiza a página.
 * Admin, telão e filmes ficam de fora.
 */
export default function GameWatcher() {
  const path = usePathname();
  const router = useRouter();
  const last = useRef<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [comets, setComets] = useState<{ id: string; text: string }[]>([]);
  const active = !/^\/(admin|telao|final|t\/)/.test(path);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    async function tick() {
      try {
        const r = await fetch("/api/game", { cache: "no-store" });
        const { phase } = (await r.json()) as { phase: string | null };
        if (!alive || !phase) return;
        if (last.current && last.current !== phase) {
          setToast(MSG[phase] ?? null);
          setTimeout(() => setToast(null), 4000);
          if ((phase === "capsule" || phase === "finale") && path !== "/universo") router.push("/universo");
          else router.refresh();
        }
        last.current = phase;
      } catch { /* rede oscilou: tenta de novo */ }
    }
    tick();
    const t = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [active, path, router]);

  // ☄️ Cometa chegou pra mim: aviso + vibração (a cada 5s, só pra quem tem planeta)
  useEffect(() => {
    if (!active || path === "/") return;
    let alive = true;
    let since = new Date().toISOString();
    const seen = new Set<string>();
    async function tick() {
      try {
        const r = await fetch(`/api/news?since=${encodeURIComponent(since)}`, { cache: "no-store" });
        if (r.status === 401) { alive = false; return; }
        const j = (await r.json()) as { items: { id: string; text: string }[]; now: string };
        if (!alive) return;
        since = j.now;
        const fresh = j.items.filter((i) => !seen.has(i.id));
        if (!fresh.length) return;
        fresh.forEach((i) => seen.add(i.id));
        setComets((c) => [...fresh.reverse(), ...c].slice(0, 3));
        try { navigator.vibrate?.([80, 40, 80]); } catch { /* sem vibração */ }
        fresh.forEach((i) => setTimeout(() => setComets((c) => c.filter((x) => x.id !== i.id)), 5000));
      } catch { /* tenta de novo */ }
    }
    const t = setInterval(() => alive && tick(), 5000);
    return () => { alive = false; clearInterval(t); };
  }, [active, path]);

  return (
    <>
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-3">
      <AnimatePresence>
        {comets.map((c) => (
          <motion.button key={c.id} onClick={() => router.push("/eu")}
            initial={{ opacity: 0, x: 120, scale: 0.8 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 18 }}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-accent/40 bg-[#14183a]/95 px-4 py-3 text-left text-sm shadow-2xl backdrop-blur">
            <motion.span animate={{ rotate: [0, -15, 15, 0] }} transition={{ repeat: 2, duration: 0.5 }} className="text-2xl">☄️</motion.span>
            <span>{c.text}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
    <AnimatePresence>
      {toast && (
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
          className="fixed inset-x-0 top-3 z-[60] mx-auto w-fit max-w-[90vw] rounded-full bg-accent px-5 py-3 text-center font-bold text-black shadow-xl">
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
