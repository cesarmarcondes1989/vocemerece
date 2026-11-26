"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decideMessage } from "@/app/admin/actions";

export default function ModerationButtons({ id, alreadyRejected }: { id: string; alreadyRejected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(approve: boolean) {
    setBusy(approve ? "approve" : "reject"); setError(null);
    const r = await decideMessage(id, approve);
    setBusy(null);
    if (!r.ok) return setError(r.error ?? "falhou");
    setDone(approve ? "✓ Aprovada e entregue ☄️" : "✓ Barrada");
    setTimeout(() => router.refresh(), 900);
  }

  if (done) return <p className="mt-3 rounded-full bg-white/10 py-2 text-center font-semibold">{done}</p>;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <button type="button" disabled={!!busy} onClick={() => go(true)}
          className="flex-1 rounded-full bg-emerald-500 py-2 font-semibold text-black disabled:opacity-60">
          {busy === "approve" ? "Aprovando…" : alreadyRejected ? "Liberar mesmo assim" : "Aprovar"}
        </button>
        {!alreadyRejected && (
          <button type="button" disabled={!!busy} onClick={() => go(false)}
            className="flex-1 rounded-full bg-red-500/80 py-2 font-semibold disabled:opacity-60">
            {busy === "reject" ? "Barrando…" : "Barrar"}
          </button>
        )}
      </div>
      {error && <p className="rounded-xl bg-red-500/20 p-2 text-sm text-red-100">⚠️ {error}</p>}
    </div>
  );
}
