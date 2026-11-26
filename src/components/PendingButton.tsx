"use client";
import { useFormStatus } from "react-dom";

/** Botão de formulário que mostra progresso (ações longas, como a revelação com IA). */
export default function PendingButton({ children, pending, confirm: ask, className }: { children: React.ReactNode; pending: string; confirm?: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button disabled={busy} className={`${className ?? ""} disabled:animate-pulse disabled:opacity-80`}
      onClick={(e) => { if (ask && !window.confirm(ask)) e.preventDefault(); }}>
      {busy ? pending : children}
    </button>
  );
}
