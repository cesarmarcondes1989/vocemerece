import Link from "next/link";
import { currentModerator, currentPerson } from "@/lib/session";
import { db, signedUrl } from "@/lib/supabase";
import { STICKERS } from "@/lib/types";
import { decide, unlock } from "./actions";

type Row = {
  id: string; kind: string; body: string | null; sticker: string | null; media_path: string | null; status: string;
  created_at: string; moderation: { reason?: string; layer?: string };
  from: { nickname: string } | null; to: { nickname: string } | null; reports: { reason: string | null }[];
};

const SELECT = "id, kind, body, sticker, media_path, status, created_at, moderation, from:people!messages_from_id_fkey(nickname), to:people!messages_to_id_fkey(nickname), reports(reason)";

export default async function Admin() {
  const me = await currentPerson();
  if (!me?.is_moderator) return <main className="p-8 text-center">Área dos gestores 🛡️</main>;

  const mod = await currentModerator();
  if (!mod)
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="mb-4 text-2xl font-bold">🛡️ Torre de controle</h1>
        <form action={unlock} className="flex gap-2">
          <input name="pin" type="password" inputMode="numeric" placeholder="PIN dos gestores" className="flex-1 rounded-full bg-white/10 px-4 py-2" />
          <button className="rounded-full bg-accent px-4 py-2 font-semibold text-black">Entrar</button>
        </form>
      </main>
    );

  const supa = db();
  const [{ data: review }, { data: rejected }, { data: people }, { count: approved }, { count: lit }] = await Promise.all([
    supa.from("messages").select(SELECT).eq("status", "review").order("created_at"),
    supa.from("messages").select(SELECT).eq("status", "rejected").order("created_at", { ascending: false }).limit(20),
    supa.from("people").select("slug, nickname").order("nickname"),
    supa.from("messages").select("*", { count: "exact", head: true }).eq("status", "approved"),
    supa.from("planets").select("*", { count: "exact", head: true }).not("lit_at", "is", null),
  ]);

  const card = async (m: Row, actions: boolean) => {
    const url = await signedUrl("uploads", m.media_path, 600);
    const st = STICKERS.find((s) => s.id === m.sticker);
    return (
      <li key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm text-muted">
          <b className="text-ink">{m.from?.nickname}</b> → <b className="text-ink">{m.to?.nickname}</b> · {m.kind} ·{" "}
          {new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        </p>
        <p className="mt-1 text-xs text-accent">
          {m.reports?.length ? `🚩 Denunciada: ${m.reports.map((r) => r.reason ?? "sem motivo").join("; ")}` : `🤖 ${m.moderation?.reason ?? ""}`}
        </p>
        {st && <p className="mt-2 text-2xl">{st.emoji} {st.label}</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && m.kind === "photo" && <img src={url} alt="" className="mt-2 max-h-80 rounded-xl" />}
        {url && m.kind === "audio" && <audio controls src={url} className="mt-2 w-full" />}
        {m.body && <p className="mt-2 whitespace-pre-wrap">{m.body}</p>}
        {actions && (
          <form action={decide} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={m.id} />
            <button name="decision" value="approve" className="flex-1 rounded-full bg-emerald-500 py-2 font-semibold text-black">Aprovar</button>
            <button name="decision" value="reject" className="flex-1 rounded-full bg-red-500/80 py-2 font-semibold">Barrar</button>
          </form>
        )}
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛡️ Torre de controle</h1>
        <Link href="/universo" className="text-sm underline">universo</Link>
      </header>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{lit ?? 0}</div><div className="text-xs">planetas acesos</div></div>
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{approved ?? 0}</div><div className="text-xs">cometas entregues</div></div>
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{review?.length ?? 0}</div><div className="text-xs">na fila</div></div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Fila de revisão</h2>
        {review?.length ? <ul className="space-y-3">{await Promise.all((review as unknown as Row[]).map((m) => card(m, true)))}</ul>
          : <p className="text-muted">Fila zerada. Céu limpo ✨</p>}
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">Barradas pela IA (últimas 20)</h2>
        <p className="mb-3 text-sm text-muted">Confira falsos positivos: dá pra liberar daqui.</p>
        <ul className="space-y-3">{await Promise.all(((rejected ?? []) as unknown as Row[]).map((m) => card(m, true)))}</ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Prévia das histórias</h2>
        <div className="flex flex-wrap gap-2">
          {(people ?? []).map((p) => (
            <Link key={p.slug} href={`/admin/preview/${p.slug}`} className="rounded-full bg-white/10 px-3 py-1 text-sm">{p.nickname}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
