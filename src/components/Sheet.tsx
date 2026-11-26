"use client";
import { motion } from "framer-motion";

export default function Sheet({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d1024] p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full bg-white/10 px-3 py-1">✕</button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
