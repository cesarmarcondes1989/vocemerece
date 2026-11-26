import Link from "next/link";
import { redirect } from "next/navigation";
import PeopleList from "@/components/PeopleList";
import { baseUrl, tokenFor } from "@/lib/people";
import { currentModerator } from "@/lib/session";
import { db, signedUrl } from "@/lib/supabase";
import type { Story } from "@/lib/types";

export default async function Pessoas() {
  if (!(await currentModerator())) redirect("/admin");
  const { data } = await db().from("people").select("id, slug, name, nickname, is_moderator, story, photo_path").order("name");
  const base = await baseUrl();
  let tokenError: string | null = null;
  try { tokenFor("teste"); } catch (e) { tokenError = (e as Error).message; }
  const people = await Promise.all((data ?? []).map(async (p) => {
    const link = tokenError ? "" : `${base}/t/${tokenFor(p.slug)}`;
    const s = (p.story ?? {}) as Story;
    const filled = [s.headline, s.moments?.length, s.numbers?.length, s.words?.length, s.quotes?.length, s.thanks, p.photo_path].filter(Boolean).length;
    return { ...p, link, filled, photo: await signedUrl("stories", p.photo_path, 600) };
  }));

  return (
    <main className="mx-auto max-w-2xl space-y-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin" className="text-sm underline">← Torre de controle</Link>
          <h1 className="text-2xl font-bold">👥 Pessoas <span className="text-muted">({people.length})</span></h1>
        </div>
        <div className="flex gap-2">
          {people.length > 0 && <a href="/admin/pessoas/tags.csv" className="rounded-full border border-white/20 px-4 py-2 text-sm">⬇︎ Links das tags (CSV)</a>}
          <Link href="/admin/pessoas/novo" className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-black">+ Nova pessoa</Link>
        </div>
      </header>
      {tokenError && <p className="rounded-xl bg-red-500/15 p-3 text-sm text-red-200">⚠️ {tokenError}</p>}
      <p className="text-sm text-muted">
        Comece cadastrando <b>você mesmo(a)</b> e marque “gestor(a)”. O link de cada pessoa é o que vai gravado na tag NFC.
        {!process.env.PUBLIC_BASE_URL && <> Os links estão usando o domínio atual ({base}); defina <code>PUBLIC_BASE_URL</code> na Vercel antes de gravar as tags.</>}
      </p>
      {people.length === 0 && <p className="rounded-2xl bg-white/5 p-6 text-center">Ninguém cadastrado ainda. Bora começar! 🚀</p>}
      <PeopleList people={people.map((p) => ({ id: p.id, slug: p.slug, name: p.name, nickname: p.nickname, is_moderator: p.is_moderator, link: p.link, filled: p.filled, photo: p.photo }))} />
    </main>
  );
}
