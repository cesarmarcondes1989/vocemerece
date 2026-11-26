"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveRules } from "@/app/admin/actions";

export default function RulesForm({ greenAt, senderCap }: { greenAt: number; senderCap: number }) {
  const router = useRouter();
  const [g, setG] = useState(greenAt);
  const [c, setC] = useState(senderCap);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = g !== greenAt || c !== senderCap;

  async function save() {
    setBusy(true); setMsg(null);
    const r = await saveRules(g, c);
    setBusy(false);
    setMsg(r.ok ? `✓ Salvo! Agora ${r.greens}/${r.total} planetas estão verdes.` : `⚠️ ${r.error}`);
    if (r.ok) router.refresh();
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        Verde com <input type="number" min={1} value={g} onChange={(e) => setG(Number(e.target.value))} className="w-16 rounded bg-white/10 px-2 py-1" /> de energia,
        máx. <input type="number" min={1} value={c} onChange={(e) => setC(Number(e.target.value))} className="w-14 rounded bg-white/10 px-2 py-1" /> por pessoa
        <button type="button" disabled={busy || !dirty} onClick={save}
          className={`rounded-full px-3 py-1 ${dirty ? "bg-accent font-semibold text-black" : "bg-white/10"} disabled:opacity-60`}>
          {busy ? "Salvando…" : "salvar"}
        </button>
      </div>
      {msg && <p className={msg.startsWith("✓") ? "text-emerald-300" : "text-red-200"}>{msg}</p>}
    </div>
  );
}
