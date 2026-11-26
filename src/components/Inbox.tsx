"use client";
import { useCallback, useEffect, useState } from "react";
import { STICKERS } from "@/lib/types";
import Sheet from "./Sheet";

type Received = { id: string; kind: string; itemRef: string | null; from: string; body: string | null; sticker: string | null; mediaUrl: string | null; capsule: boolean; sealed: boolean; read: boolean; created_at: string };
type Sent = { id: string; kind: string; to: string; status: string; reason: string | null; created_at: string };

function refLabel(ref: string | null) {
  if (!ref) return "";
  if (ref === "photo") return "na sua foto";
  if (ref === "words") return "nas suas 3 palavras";
  if (ref.startsWith("moment:")) return "num momento seu";
  if (ref.startsWith("number:")) return "num número seu";
  if (ref.startsWith("quote:")) return "num recado pra você";
  if (ref.startsWith("item:")) return "numa conquista sua";
  return "";
}

const STATUS: Record<string, string> = { approved: "✅ entregue", review: "🛰️ na alfândega", rejected: "🚫 não decolou", pending: "⏳" };

export default function Inbox({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"in" | "out">("in");
  const [data, setData] = useState<{ received: Received[]; sent: Sent[] } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/inbox");
    if (r.ok) setData(await r.json());
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 20000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [load]);

  async function act(id: string, action: "read" | "hide" | "report") {
    if (action === "report" && !confirm("Denunciar esse cometa? Ele some daqui e um gestor vai olhar.")) return;
    await fetch(`/api/messages/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    load();
  }

  return (
    <Sheet title="Recebidos ☄️" onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1 text-sm">
        <button onClick={() => setTab("in")} className={`rounded-full py-2 ${tab === "in" ? "bg-white font-semibold text-black" : ""}`}>Recebidos {data ? `(${data.received.length})` : ""}</button>
        <button onClick={() => setTab("out")} className={`rounded-full py-2 ${tab === "out" ? "bg-white font-semibold text-black" : ""}`}>Enviados</button>
      </div>
      {!data && <p className="py-8 text-center text-muted">Carregando…</p>}

      {data && tab === "in" && (data.received.length === 0
        ? <p className="py-8 text-center text-muted">Nenhum cometa ainda. Que tal mandar o primeiro? 😉</p>
        : <ul className="space-y-3">
          {data.received.map((m) => {
            const st = STICKERS.find((s) => s.id === m.sticker);
            return (
              <li key={m.id} onClick={() => !m.read && act(m.id, "read")}
                className={`rounded-2xl border p-4 ${m.read ? "border-white/10" : "border-accent/50 bg-accent/5"}`}>
                <p className="mb-2 text-sm text-muted">de <b className="text-ink">{m.from}</b>{m.capsule && " · 🔒 cápsula"}</p>
                {m.kind === "reaction" ? <p className="text-2xl">{m.sticker} <span className="text-sm text-muted">reagiu {refLabel(m.itemRef)}</span></p> : m.sealed ? <p>🔒 Esse cometa só abre em dezembro de 2027. Segura a ansiedade!</p> : <>
                  {st && <p className="text-3xl">{st.emoji} <span className="text-base">{st.label}</span></p>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.kind === "photo" && m.mediaUrl && <img src={m.mediaUrl} alt="" className="mb-2 w-full rounded-xl" />}
                  {m.kind === "audio" && m.mediaUrl && <audio controls src={m.mediaUrl} className="mb-2 w-full" />}
                  {m.kind === "comment" && <p className="text-xs text-muted">comentou {refLabel(m.itemRef)}</p>}
                  {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                </>}
                <div className="mt-3 flex gap-4 text-xs text-muted">
                  <button onClick={(e) => { e.stopPropagation(); act(m.id, "hide"); }}>ocultar</button>
                  <button onClick={(e) => { e.stopPropagation(); act(m.id, "report"); }}>denunciar</button>
                </div>
              </li>
            );
          })}
        </ul>)}

      {data && tab === "out" && (
        <ul className="space-y-2">
          {data.sent.map((m) => (
            <li key={m.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-sm">
              <span>{m.kind} → <b>{m.to}</b>{m.reason && <span className="block text-xs text-muted">{m.reason}</span>}</span>
              <span>{STATUS[m.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
