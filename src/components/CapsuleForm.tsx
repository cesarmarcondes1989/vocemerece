"use client";
import { useState } from "react";

export default function CapsuleForm({ onDone }: { onDone: () => void }) {
  const [paraMim, setParaMim] = useState("");
  const [paraEmpresa, setParaEmpresa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function seal() {
    setBusy(true); setError(null);
    const r = await fetch("/api/capsule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paraMim, paraEmpresa }) });
    setBusy(false);
    if (!r.ok) return setError((await r.json()).error);
    onDone();
  }

  return (
    <div className="space-y-4 text-left">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="font-bold">💌 Para você, em dezembro de 2027</p>
        <p className="mb-2 text-xs text-muted">Só você vai ler. Ninguém mais. Nem a IA, nem gestor, nem diretoria.</p>
        <textarea value={paraMim} onChange={(e) => setParaMim(e.target.value.slice(0, 1500))} rows={5}
          placeholder="Querido(a) eu de 2027: espero que você tenha…" className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-accent" />
      </div>
      <div className="rounded-3xl border border-accent/30 bg-accent/5 p-4">
        <p className="font-bold">🏢 Para a empresa em 2027 <span className="font-normal text-muted">(opcional)</span></p>
        <p className="mb-2 text-xs text-muted">Entra <b>sem seu nome</b> numa cápsula geral que a IA monta para a diretoria. O que você quer ver acontecer? O que não pode se perder?</p>
        <textarea value={paraEmpresa} onChange={(e) => setParaEmpresa(e.target.value.slice(0, 1500))} rows={4}
          placeholder="Em 2027 eu quero que a gente…" className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-sm outline-none focus:border-accent" />
      </div>
      {error && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy || paraMim.trim().length < 10} onClick={seal} className="w-full rounded-full bg-accent py-4 font-black text-black disabled:opacity-40">
        {busy ? "Lacrando…" : "Lacrar cápsula 🔒"}
      </button>
    </div>
  );
}
