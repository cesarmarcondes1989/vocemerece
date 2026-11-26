"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deletePerson, draftFromNotes, savePerson } from "@/app/admin/pessoas/actions";
import type { Story } from "@/lib/types";
import CopyButton from "./CopyButton";

type P = { id: string; slug: string; name: string; nickname: string; is_moderator: boolean; story: Story; photo_path: string | null };
type Previews = { photo: string | null; moments: (string | null)[] };

const input = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none focus:border-accent";
const box = "space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4";

/** Reduz a foto no navegador (máx. 1600px, JPEG): upload rápido e cabe no limite da Vercel. */
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.85));
}

function Photo({ name, keep, preview, label }: { name: string; keep?: string | null; preview?: string | null; label: string }) {
  const [url, setUrl] = useState(preview ?? null);
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <span className="grid h-16 w-16 place-items-center rounded-2xl border border-dashed border-white/25">📷</span>}
      <span className="text-muted">{url ? "trocar" : label}</span>
      <input type="file" name={name} accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUrl(URL.createObjectURL(f)); }} />
      {keep && <input type="hidden" name={`${name}_keep`} value={keep} />}
    </label>
  );
}

export default function PersonForm({ person, previews, link }: { person: P | null; previews?: Previews; link?: string | null }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [s, setS] = useState<Story>(person?.story ?? {});
  const [formKey, setFormKey] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("Salvando…"); setMsg(null);
    const fd = new FormData(e.currentTarget);
    for (const [k, v] of [...fd.entries()]) {
      if (v instanceof File) {
        if (v.size === 0) fd.delete(k);
        else fd.set(k, await shrink(v), "foto.jpg");
      }
    }
    const r = await savePerson(fd);
    setBusy(null);
    if (!r.ok) return setMsg(`⚠️ ${r.error}`);
    setMsg("✓ Salvo!");
    router.push(person ? `/admin/pessoas/${r.slug}` : `/admin/pessoas/${r.slug}`);
    router.refresh();
  }

  async function draft() {
    const name = (formRef.current?.elements.namedItem("name") as HTMLInputElement)?.value ?? "";
    const nick = (formRef.current?.elements.namedItem("nickname") as HTMLInputElement)?.value ?? "";
    setBusy("A IA está escrevendo… ✨"); setMsg(null);
    const r = await draftFromNotes(name, nick || name, notes);
    setBusy(null);
    if (!r.story) return setMsg(`⚠️ ${r.error ?? "A IA não conseguiu gerar"}`);
    // mantém as fotos já escolhidas
    setS((old) => ({ ...r.story!, moments: r.story!.moments?.map((m, i) => ({ ...m, photo: old.moments?.[i]?.photo })) }));
    setFormKey((k) => k + 1);
    setMsg("✨ Rascunho pronto! Revise tudo antes de salvar: a IA só usa o que está nas notas.");
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{person ? `Editar ${person.nickname}` : "Nova pessoa"}</h1>
      {link && (
        <div className="flex items-center gap-2 rounded-2xl bg-accent/10 p-3 text-sm">
          <span className="flex-1 truncate">🔗 Link da tag: <code className="text-xs">{link}</code></span>
          <CopyButton text={link} label="copiar" />
          <Link href={`/admin/preview/${person!.slug}`} className="rounded-full bg-white/10 px-3 py-1">prévia</Link>
        </div>
      )}

      <details className={box}>
        <summary className="cursor-pointer font-semibold">✨ Preencher com IA a partir de notas soltas</summary>
        <p className="text-xs text-muted">Cole o que você sabe da pessoa: respostas do formulário, recados de colegas, conquistas. A IA organiza nos campos abaixo e você revisa.</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className={input}
          placeholder="Ex.: Liderou a migração do banco no feriado sem downtime. Revisou uns 47 PRs. A Ana disse: 'nunca deixa ninguém sozinho num incidente'. Leal, engraçado, curioso…" />
        <button type="button" onClick={draft} disabled={!!busy} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black disabled:opacity-40">Gerar rascunho</button>
      </details>

      <form ref={formRef} key={formKey} onSubmit={submit} className="space-y-4">
        <input type="hidden" name="id" value={person?.id ?? ""} />
        <input type="hidden" name="slug" value={person?.slug ?? ""} />

        <section className={box}>
          <h2 className="font-semibold">Quem é</h2>
          <input name="name" required defaultValue={person?.name} placeholder="Nome completo" className={input} />
          <input name="nickname" defaultValue={person?.nickname} placeholder="Apelido (como aparece no planeta)" className={input} />
          <Photo name="photo" keep={person?.photo_path} preview={previews?.photo} label="foto de perfil" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_moderator" defaultChecked={person?.is_moderator} /> 🛡️ Gestor(a): vê o botão da torre de controle no jogo</label>
        </section>

        <section className={box}>
          <h2 className="font-semibold">Manchete do ano</h2>
          <input name="headline" defaultValue={s.headline} maxLength={70} placeholder="2026 foi o ano em que você virou foguete 🚀" className={input} />
        </section>

        <section className={box}>
          <h2 className="font-semibold">Momentos de 2026 <span className="text-xs font-normal text-muted">(até 3)</span></h2>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 rounded-2xl bg-black/20 p-3">
              <input name={`m${i}_title`} defaultValue={s.moments?.[i]?.title} maxLength={50} placeholder={`Momento ${i + 1}: título`} className={input} />
              <textarea name={`m${i}_text`} defaultValue={s.moments?.[i]?.text} maxLength={160} rows={2} placeholder="O que aconteceu (até 160 caracteres)" className={input} />
              <Photo name={`m${i}_photo`} keep={person?.story.moments?.[i]?.photo} preview={previews?.moments[i]} label="foto do momento (opcional)" />
            </div>
          ))}
        </section>

        <section className={box}>
          <h2 className="font-semibold">Números <span className="text-xs font-normal text-muted">(até 3)</span></h2>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2">
              <input name={`n${i}_value`} defaultValue={s.numbers?.[i]?.value} maxLength={8} placeholder="47" className={`${input} w-24`} />
              <input name={`n${i}_label`} defaultValue={s.numbers?.[i]?.label} maxLength={40} placeholder="PRs revisados" className={input} />
            </div>
          ))}
        </section>

        <section className={box}>
          <h2 className="font-semibold">3 palavras</h2>
          <div className="flex gap-2">{[0, 1, 2].map((i) => <input key={i} name={`w${i}`} defaultValue={s.words?.[i]} maxLength={20} className={input} />)}</div>
        </section>

        <section className={box}>
          <h2 className="font-semibold">O que dizem por aí <span className="text-xs font-normal text-muted">(até 2 recados)</span></h2>
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-2">
              <input name={`q${i}_text`} defaultValue={s.quotes?.[i]?.text} maxLength={130} placeholder="Nunca deixa ninguém sozinho num incidente." className={input} />
              <input name={`q${i}_from`} defaultValue={s.quotes?.[i]?.from} maxLength={20} placeholder="Ana" className={`${input} w-28`} />
            </div>
          ))}
        </section>

        <section className={box}>
          <h2 className="font-semibold">Agradecimento</h2>
          <textarea name="thanks" defaultValue={s.thanks} maxLength={200} rows={2} placeholder="Obrigado por segurar o leme quando o mar ficou bravo." className={input} />
        </section>

        {msg && <p className="rounded-xl bg-white/5 p-3 text-sm">{msg}</p>}
        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-space via-space/90 to-transparent p-4">
          <button disabled={!!busy} className="mx-auto block w-full max-w-xl rounded-full bg-accent py-3 font-black text-black disabled:opacity-50">{busy ?? "Salvar"}</button>
        </div>
      </form>

      {person && (
        <form action={deletePerson} onSubmit={(e) => { if (!confirm(`Apagar ${person.nickname}? Some o planeta e tudo que recebeu.`)) e.preventDefault(); else setTimeout(() => router.push("/admin/pessoas"), 300); }}>
          <input type="hidden" name="id" value={person.id} />
          <button className="text-sm text-red-300 underline">apagar pessoa</button>
        </form>
      )}
    </div>
  );
}
