"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProfileData } from "@/lib/profile";
import type { GamePhase } from "@/lib/types";
import Composer from "./Composer";
import Consent from "./Consent";
import ProfileView from "./ProfileView";

export default function PlanetVisit({ profile, color, phase, consented: c0 }: { profile: ProfileData; color: string; phase: GamePhase; consented: boolean }) {
  const router = useRouter();
  const [consented, setConsented] = useState(c0);
  const [composer, setComposer] = useState(false);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const playing = phase === "playing" || phase === "capsule";

  const onXp = (xp: number, msg?: string) => {
    const text = msg ?? (xp ? `+${xp} XP ✨` : "");
    if (!text) return;
    const id = Date.now();
    setToast({ id, text });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 1600);
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-32 pt-[max(env(safe-area-inset-top),16px)]">
      <Link href="/universo" className="mb-2 inline-block rounded-full bg-white/10 px-4 py-2 text-sm">← Universo</Link>
      {!playing && (
        <p className="mb-3 rounded-2xl bg-white/5 p-3 text-center text-sm text-muted">
          {phase === "lobby" ? "🛸 O jogo ainda não começou: dá pra espiar, mas reagir só depois da largada!" : "🎬 O jogo acabou! Obrigado por espalhar carinho."}
        </p>
      )}
      <ProfileView data={profile} color={color} mode={{ kind: "visit", canInteract: playing && consented, onXp }} />

      {playing && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-space via-space/90 to-transparent p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
          <button onClick={() => setComposer(true)}
            className="mx-auto block w-full max-w-md rounded-full bg-accent py-4 text-lg font-black text-black shadow-[0_0_40px_#ffcf5a88]">
            Mandar um cometa para {profile.nickname} ☄️
          </button>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }}
            className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-accent px-5 py-2 font-black text-black shadow-lg">
            {toast.text}
          </motion.div>
        )}
        {playing && !consented && <Consent key="k" onDone={() => setConsented(true)} onClose={() => router.push("/universo")} />}
        {composer && consented && (
          <Composer key="c" target={{ id: profile.id, nickname: profile.nickname, color }} onClose={() => setComposer(false)} onXp={(xp) => onXp(xp)} />
        )}
      </AnimatePresence>
    </main>
  );
}
