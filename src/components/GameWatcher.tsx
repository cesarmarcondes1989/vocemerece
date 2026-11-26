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

  return (
    <AnimatePresence>
      {toast && (
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
          className="fixed inset-x-0 top-3 z-[60] mx-auto w-fit max-w-[90vw] rounded-full bg-accent px-5 py-3 text-center font-bold text-black shadow-xl">
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
