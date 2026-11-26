"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CommentView, ProfileData } from "@/lib/profile";
import { REACTIONS } from "@/lib/types";

type Mode = { kind: "self" } | { kind: "visit"; canInteract: boolean; onXp?: (xp: number, msg?: string) => void };

const card = "rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur";

export default function ProfileView({ data, mode, color }: { data: ProfileData; mode: Mode; color?: string }) {
  const s = data.story;
  return (
    <div className="space-y-4">
      <motion.header initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 pt-2 text-center">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full blur-xl" style={{ background: color ?? "#6b7cff", opacity: 0.5 }} />
          {data.photoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={data.photoUrl} alt="" className="relative h-28 w-28 rounded-full border-4 object-cover" style={{ borderColor: color ?? "#6b7cff" }} />
            : <div className="relative grid h-28 w-28 place-items-center rounded-full border-4 text-5xl" style={{ borderColor: color ?? "#6b7cff" }}>🪐</div>}
        </div>
        <div>
          <h1 className="text-3xl font-black">{data.nickname}</h1>
          {s.headline && <p className="mt-1 text-muted">{s.headline}</p>}
        </div>
        {mode.kind === "visit" && data.photoUrl && <Reactable data={data} itemRef="photo" mode={mode} compact />}
      </motion.header>

      {(s.moments ?? []).map((m, i) => (
        <Block key={i} data={data} itemRef={`moment:${i}`} mode={mode}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {m.photo && <img src={m.photo} alt="" className="mb-3 max-h-64 w-full rounded-2xl object-cover" />}
          <p className="text-xs uppercase tracking-widest text-accent">Momento de 2026</p>
          <h3 className="text-xl font-bold">{m.title}</h3>
          <p className="text-ink/85">{m.text}</p>
        </Block>
      ))}

      {!!s.numbers?.length && (
        <div className="grid grid-cols-2 gap-3">
          {s.numbers.map((n, i) => (
            <Block key={i} data={data} itemRef={`number:${i}`} mode={mode}>
              <div className="text-4xl font-black text-accent">{n.value}</div>
              <div className="text-sm">{n.label}</div>
            </Block>
          ))}
        </div>
      )}

      {!!s.words?.length && (
        <Block data={data} itemRef="words" mode={mode}>
          <p className="mb-2 text-xs uppercase tracking-widest text-accent">Em 3 palavras</p>
          <div className="flex flex-wrap gap-2">{s.words.map((w) => <span key={w} className="rounded-full bg-white/10 px-3 py-1 font-bold">{w}</span>)}</div>
        </Block>
      )}

      {(s.quotes ?? []).map((q, i) => (
        <Block key={i} data={data} itemRef={`quote:${i}`} mode={mode}>
          <p className="text-lg font-semibold">“{q.text}”</p>
          <p className="text-sm text-accent">— {q.from}</p>
        </Block>
      ))}

      {(data.items.length > 0 || mode.kind === "self") && (
        <section className="space-y-3">
          <h2 className="pt-2 text-sm uppercase tracking-widest text-muted">
            {mode.kind === "self" ? "O que você fez e a gente não mapeou" : `Conquistas que ${data.nickname} adicionou`}
          </h2>
          {data.items.map((it) => (
            <Block key={it.id} data={data} itemRef={`item:${it.id}`} mode={mode}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{it.emoji}</span>
                <p className="flex-1">{it.text}</p>
                {mode.kind === "self" && <SelfItemActions id={it.id} status={it.status} />}
              </div>
            </Block>
          ))}
          {mode.kind === "self" && <AddItem />}
        </section>
      )}
    </div>
  );
}

function Block({ data, itemRef, mode, children }: { data: ProfileData; itemRef: string; mode: Mode; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={card}>
      {children}
      <Reactable data={data} itemRef={itemRef} mode={mode} />
    </motion.div>
  );
}

/** Barra de reações + comentários de um item. No próprio planeta: só mostra o que chegou. */
function Reactable({ data, itemRef, mode, compact }: { data: ProfileData; itemRef: string; mode: Mode; compact?: boolean }) {
  const initial = data.reactions[itemRef] ?? { counts: {}, mine: [] };
  const [counts, setCounts] = useState(initial.counts);
  const [mine, setMine] = useState(initial.mine);
  const [comments, setComments] = useState<CommentView[]>(data.comments.filter((c) => c.itemRef === itemRef));
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const visit = mode.kind === "visit" ? mode : null;

  async function toggle(e: string) {
    if (!visit?.canInteract) return;
    const had = mine.includes(e);
    setMine((m) => (had ? m.filter((x) => x !== e) : [...m, e]));
    setCounts((c) => ({ ...c, [e]: Math.max(0, (c[e] ?? 0) + (had ? -1 : 1)) }));
    if (had) {
      await fetch(`/api/messages?${new URLSearchParams({ to: data.id, itemRef, emoji: e })}`, { method: "DELETE" });
    } else {
      const r = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: data.id, kind: "reaction", sticker: e, itemRef }) });
      const j = await r.json();
      if (r.ok) visit.onXp?.(j.xp);
      else visit.onXp?.(0, j.error);
    }
  }

  async function comment() {
    if (!visit || !text.trim()) return;
    setBusy(true); setNote(null);
    const r = await fetch("/api/messages", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: data.id, kind: "comment", body: text, itemRef }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setNote(j.error);
    if (j.status === "approved") { setComments((c) => [...c, { id: j.id, itemRef, from: "você", body: text }]); setText(""); visit.onXp?.(j.xp); }
    else if (j.status === "review") { setText(""); setNote("🛰️ Na alfândega galáctica: um gestor libera rapidinho."); }
    else setNote(`🫣 ${j.reason}${j.suggestion ? ` Que tal: “${j.suggestion}”` : ""}`);
  }

  const shown = visit ? REACTIONS : REACTIONS.filter((e) => counts[e]);
  return (
    <div className={compact ? "" : "mt-3"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((e) => (
          <motion.button key={e} whileTap={{ scale: 1.4 }} onClick={() => toggle(e)} disabled={!visit?.canInteract}
            className={`rounded-full px-2.5 py-1 text-sm transition ${mine.includes(e) ? "bg-accent/25 ring-1 ring-accent" : "bg-white/5"} disabled:cursor-default`}>
            {e}{counts[e] ? <span className="ml-1 text-xs">{counts[e]}</span> : null}
          </motion.button>
        ))}
        {!compact && (visit?.canInteract || comments.length > 0) && (
          <button onClick={() => setOpen((o) => !o)} className="ml-auto text-xs text-muted">
            💬 {comments.length || ""} {visit?.canInteract ? "comentar" : ""}
          </button>
        )}
      </div>
      <AnimatePresence>
        {open && !compact && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="mt-3 space-y-2">
              {comments.map((c) => <li key={c.id} className="rounded-2xl bg-white/5 px-3 py-2 text-sm"><b>{c.from}</b> {c.body}</li>)}
            </ul>
            {visit?.canInteract && (
              <div className="mt-2 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value.slice(0, 300))} onKeyDown={(e) => e.key === "Enter" && comment()}
                  placeholder="Comenta com carinho (zoeira liberada)" className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-accent" />
                <button disabled={busy || !text.trim()} onClick={comment} className="rounded-full bg-accent px-4 text-sm font-bold text-black disabled:opacity-40">↑</button>
              </div>
            )}
            {note && <p className="mt-2 text-xs text-muted">{note}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const EMOJIS = ["✨", "🏆", "🚀", "🛠️", "🎤", "📈", "🤝", "💡", "🐛", "🌱"];

function AddItem() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function add() {
    setBusy(true); setNote(null);
    const r = await fetch("/api/profile-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, emoji }) });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setNote(j.error);
    if (j.item.status === "rejected") return setNote(`🫣 ${j.reason}${j.suggestion ? ` Que tal: “${j.suggestion}”` : ""}`);
    if (j.item.status === "review") setNote("🛰️ Um gestor dá uma olhadinha e já aparece pra galera.");
    setText("");
    router.refresh();
  }

  return (
    <div className={`${card} border-dashed`}>
      <p className="mb-2 text-sm">Fez algo incrível em 2026 que não tá aqui? Conta pra galera 👇</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => setEmoji(e)} className={`rounded-full px-2 py-1 ${emoji === e ? "bg-accent/30 ring-1 ring-accent" : "bg-white/5"}`}>{e}</button>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 200))} rows={2}
        placeholder="Ex.: Organizei o primeiro hackathon do time" className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-accent" />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted">{text.length}/200</span>
        <button disabled={busy || text.trim().length < 3} onClick={add} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
          {busy ? "Checando…" : "Adicionar"}
        </button>
      </div>
      {note && <p className="mt-2 text-xs text-muted">{note}</p>}
    </div>
  );
}

function SelfItemActions({ id, status }: { id: string; status?: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      {status === "review" && <span className="text-muted">🛰️ em análise</span>}
      <button onClick={async () => { await fetch(`/api/profile-items?id=${id}`, { method: "DELETE" }); router.refresh(); }} className="text-muted underline">remover</button>
    </div>
  );
}
