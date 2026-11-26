"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import CopyButton from "./CopyButton";

export type PersonRow = { id: string; slug: string; name: string; nickname: string; is_moderator: boolean; link: string; filled: number; photo: string | null };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function PeopleList({ people }: { people: PersonRow[] }) {
  const [q, setQ] = useState("");
  const [showBots, setShowBots] = useState(false);
  const [qr, setQr] = useState<PersonRow | null>(null);
  const bots = people.filter((p) => p.slug.startsWith("sim-")).length;

  const list = useMemo(() => people
    .filter((p) => showBots || !p.slug.startsWith("sim-"))
    .filter((p) => !q || norm(`${p.nickname} ${p.name}`).includes(norm(q)))
    .sort((a, b) => a.nickname.localeCompare(b.nickname, "pt-BR", { sensitivity: "base" })), [people, q, showBots]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Buscar pelo nome ou apelido…" autoFocus
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 outline-none focus:border-accent" />
        {bots > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={showBots} onChange={(e) => setShowBots(e.target.checked)} /> mostrar {bots} robôs
          </label>
        )}
      </div>

      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.photo ? <img src={p.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10">🪐</div>}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{p.nickname} <span className="text-sm font-normal text-muted">{p.name}{p.is_moderator && " · 🛡️ gestor(a)"}</span></p>
              <p className="text-xs text-muted">Perfil {p.filled}/7 preenchido</p>
            </div>
            {p.link && <button type="button" onClick={() => setQr(p)} className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-black">QR</button>}
            {p.link && <CopyButton text={p.link} label="🔗" />}
            <Link href={`/admin/pessoas/${p.slug}`} className="rounded-full bg-white/10 px-3 py-1 text-sm">editar</Link>
          </li>
        ))}
        {list.length === 0 && <li className="p-4 text-center text-muted">Ninguém encontrado.</li>}
      </ul>

      <AnimatePresence>{qr && <QrModal person={qr} onClose={() => setQr(null)} />}</AnimatePresence>
    </>
  );
}

/** QR code em tela cheia: plano B se o NFC falhar. A pessoa escaneia com a câmera e entra no planeta dela. */
function QrModal({ person, onClose }: { person: PersonRow; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(person.link, { width: 640, margin: 2, errorCorrectionLevel: "M", color: { dark: "#05060f", light: "#ffffff" } }).then(setSrc);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [person.link, onClose]);

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.85 }} animate={{ scale: 1 }}
        className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-6 text-center text-black">
        <p className="text-sm uppercase tracking-widest text-gray-500">Planeta de</p>
        <h2 className="text-3xl font-black">{person.nickname}</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt={`QR code de ${person.nickname}`} className="mx-auto w-full max-w-[320px]" /> : <div className="mx-auto h-[320px] w-[320px] animate-pulse rounded-2xl bg-gray-200" />}
        <p className="text-sm text-gray-600">Aponte a câmera do celular 📷</p>
        <p className="text-xs text-gray-400">⚠️ Esse QR é o acesso da pessoa: mostre só pra ela.</p>
        <button onClick={onClose} className="w-full rounded-full bg-black py-3 font-bold text-white">Fechar</button>
      </motion.div>
    </motion.div>
  );
}
