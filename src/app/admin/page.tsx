import Link from "next/link";
import { currentModerator } from "@/lib/session";
import { db, signedUrl } from "@/lib/supabase";
import { STICKERS } from "@/lib/types";
import PendingButton from "@/components/PendingButton";
import { energyColor, isGreen } from "@/lib/colors";
import { getGame, SetupError } from "@/lib/game";
import { backToLobby, decide, lock, decideItem, forceCapsule, revealFinale, setGreenAt, startGame, unlock } from "./actions";

// a revelação chama a IA (estatísticas + cápsula da diretoria): pode levar ~1 min
export const maxDuration = 300;

type Row = {
  id: string; kind: string; body: string | null; sticker: string | null; media_path: string | null; status: string;
  created_at: string; moderation: { reason?: string; layer?: string };
  from: { nickname: string } | null; to: { nickname: string } | null; reports: { reason: string | null }[];
};

const SELECT = "id, kind, body, sticker, media_path, status, created_at, moderation, from:people!messages_from_id_fkey(nickname), to:people!messages_to_id_fkey(nickname), reports(reason)";

export default async function Admin() {
  if (!(await currentModerator()))
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="mb-1 text-2xl font-bold">🛡️ Torre de controle</h1>
        <p className="mb-4 text-sm text-muted">Área dos gestores. Use o <code>ADMIN_PIN</code> configurado na Vercel.</p>
        <form action={unlock} className="flex gap-2">
          <input name="pin" type="password" inputMode="numeric" placeholder="PIN dos gestores" autoFocus className="flex-1 rounded-full bg-white/10 px-4 py-2" />
          <button className="rounded-full bg-accent px-4 py-2 font-semibold text-black">Entrar</button>
        </form>
      </main>
    );

  const supa = db();
  try {
    await getGame();
  } catch (e) {
    return <SetupNeeded message={e instanceof SetupError ? e.message : String(e)} />;
  }
  const [game, { data: planets }, { data: items }, { count: capsules }] = await Promise.all([
    getGame(),
    supa.from("planets").select("id, nickname, energy, senders, lit_at").order("energy"),
    supa.from("profile_items").select("id, text, emoji, moderation, person:people(nickname)").eq("status", "review"),
    supa.from("capsules").select("person_id", { count: "exact", head: true }),
  ]);
  const greens = (planets ?? []).filter((p) => isGreen(p.energy, game.green_at)).length;
  const care = (planets ?? []).filter((p) => !isGreen(p.energy, game.green_at)).slice(0, 8);
  const btn = "rounded-full px-4 py-2 text-sm font-semibold";
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
        <div className="flex gap-3 text-sm">
          <Link href="/admin/pessoas" className="rounded-full bg-accent px-4 py-2 font-bold text-black">👥 Pessoas</Link>
          <Link href="/universo" className="py-2 underline">universo</Link>
          <form action={lock}><button className="py-2 text-muted underline">sair</button></form>
        </div>
      </header>
      <section className="space-y-3 rounded-3xl border border-accent/30 bg-accent/5 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">🎮 Jogo: <span className="text-accent">{({ lobby: "Lobby", playing: "Valendo!", capsule: "Cápsulas", finale: "Final" } as const)[game.phase]}</span></h2>
          <span className="text-sm">{greens}/{planets?.length ?? 0} verdes · {capsules ?? 0} cápsulas</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.phase === "lobby" && <form action={startGame}><button className={`${btn} bg-emerald-400 text-black`}>🚀 Dar a largada</button></form>}
          {game.phase === "playing" && <form action={forceCapsule}><button className={`${btn} bg-white/15`}>⏭️ Encerrar e ir pras cápsulas</button></form>}
          {(game.phase === "capsule" || game.phase === "playing") && (
            <form action={revealFinale}>
              <PendingButton className={`${btn} bg-accent text-black`} pending="⏳ Gerando filmes e cápsula com IA… (~1 min, não feche)"
                confirm="Revelar agora? O jogo acaba e todo mundo recebe o filme.">🎬 Grande revelação</PendingButton>
            </form>
          )}
          <Link href="/admin/previa/time" className={`${btn} border border-accent/50`}>👀 Prévia do filme do time</Link>
          {game.phase === "finale" && <Link href="/final/time" className={`${btn} bg-accent text-black`}>🎬 Filme do time (telão)</Link>}
          {game.phase !== "lobby" && <form action={backToLobby}><button className={`${btn} border border-white/20`}>↩︎ voltar ao lobby</button></form>}
          <Link href="/admin/capsula" className={`${btn} border border-white/20`}>🏢 Cápsula da diretoria</Link>
        </div>
        <form action={setGreenAt} className="flex flex-wrap items-center gap-2 text-sm">
          Verde com <input name="green_at" type="number" defaultValue={game.green_at} className="w-16 rounded bg-white/10 px-2 py-1" /> de energia,
          máx. <input name="sender_cap" type="number" defaultValue={game.sender_cap} className="w-14 rounded bg-white/10 px-2 py-1" /> por pessoa
          <button className="rounded-full bg-white/10 px-3 py-1">salvar</button>
        </form>
        <p className="text-xs text-muted">Energia: reação 1 · sticker 2 · comentário 3 · mensagem 4 · foto 5. Com 30 e teto 8, cada planeta precisa de pelo menos 4 pessoas diferentes (na prática, 8–12). Dá pra ajustar AO VIVO: jogo rápido demais? Aumenta. Travou? Diminui.</p>
      </section>

      {game.phase === "playing" && care.length > 0 && (
        <section className="rounded-3xl bg-white/5 p-4">
          <h2 className="font-bold">💛 Precisando de carinho <span className="text-xs font-normal text-muted">(só gestores veem: dá um empurrãozinho discreto no grupo)</span></h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {care.map((p) => (
              <span key={p.id} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ background: energyColor(p.energy, game.green_at) }} />
                {p.nickname} <span className="text-muted">{p.energy}/{game.green_at}{!p.lit_at && " · 💤 não entrou"}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{lit ?? 0}</div><div className="text-xs">planetas acesos</div></div>
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{approved ?? 0}</div><div className="text-xs">interações</div></div>
        <div className="rounded-2xl bg-white/5 p-3"><div className="text-3xl font-black text-accent">{review?.length ?? 0}</div><div className="text-xs">na fila</div></div>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">Fila de revisão</h2>
        {review?.length ? <ul className="space-y-3">{await Promise.all((review as unknown as Row[]).map((m) => card(m, true)))}</ul>
          : <p className="text-muted">Fila zerada. Céu limpo ✨</p>}
      </section>

      {!!items?.length && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Conquistas adicionadas (revisão)</h2>
          <ul className="space-y-3">
            {(items as unknown as { id: string; text: string; emoji: string; moderation: { reason?: string }; person: { nickname: string } | null }[]).map((it) => (
              <li key={it.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-muted"><b className="text-ink">{it.person?.nickname}</b> · 🤖 {it.moderation?.reason}</p>
                <p className="mt-1">{it.emoji} {it.text}</p>
                <form action={decideItem} className="mt-3 flex gap-2">
                  <input type="hidden" name="id" value={it.id} />
                  <button name="decision" value="approve" className="flex-1 rounded-full bg-emerald-500 py-2 font-semibold text-black">Aprovar</button>
                  <button name="decision" value="reject" className="flex-1 rounded-full bg-red-500/80 py-2 font-semibold">Barrar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-lg font-bold">Barradas pela IA (últimas 20)</h2>
        <p className="mb-3 text-sm text-muted">Confira falsos positivos: dá pra liberar daqui.</p>
        <ul className="space-y-3">{await Promise.all(((rejected ?? []) as unknown as Row[]).map((m) => card(m, true)))}</ul>
      </section>

      <section>
        <h2 className="mb-1 text-lg font-bold">Prévias por pessoa</h2>
        <p className="mb-3 text-sm text-muted">Toque no nome para ver o planeta; 🎬 para ver o filme pessoal com os dados de agora.</p>
        <div className="flex flex-wrap gap-2">
          {(people ?? []).map((p) => (
            <span key={p.slug} className="flex overflow-hidden rounded-full bg-white/10 text-sm">
              <Link href={`/admin/preview/${p.slug}`} className="px-3 py-1">{p.nickname}</Link>
              <Link href={`/admin/previa/${p.slug}`} className="border-l border-white/10 px-2 py-1" title="filme pessoal">🎬</Link>
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function SetupNeeded({ message }: { message: string }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-8">
      <h1 className="text-2xl font-bold">🛠️ Falta configurar o Supabase</h1>
      <p className="rounded-2xl bg-red-500/15 p-4 text-red-100">{message}</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
        <li>Abra o projeto no Supabase → <b className="text-ink">SQL Editor</b> → New query.</li>
        <li>Cole o conteúdo de <code>supabase/migrations/0001_init.sql</code> (do GitHub) e clique em <b className="text-ink">Run</b>.</li>
        <li>Repita com <code>supabase/migrations/0002_jogo.sql</code>.</li>
        <li>Volte aqui e recarregue a página.</li>
      </ol>
    </main>
  );
}
