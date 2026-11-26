import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PersonForm from "@/components/PersonForm";
import { baseUrl, tokenFor } from "@/lib/people";
import { currentModerator } from "@/lib/session";
import { db, signedUrl } from "@/lib/supabase";
import type { Story } from "@/lib/types";

export default async function EditPessoa({ params }: PageProps<"/admin/pessoas/[slug]">) {
  if (!(await currentModerator())) redirect("/admin");
  const { slug } = await params;
  if (slug === "novo") return <Shell><PersonForm person={null} /></Shell>;

  const { data: p } = await db().from("people").select("id, slug, name, nickname, is_moderator, story, photo_path").eq("slug", slug).maybeSingle();
  if (!p) notFound();
  const story = (p.story ?? {}) as Story;
  const previews = {
    photo: await signedUrl("stories", p.photo_path, 3600),
    moments: await Promise.all([0, 1, 2].map((i) => signedUrl("stories", story.moments?.[i]?.photo, 3600))),
  };
  let link: string | null = null;
  try { link = `${await baseUrl()}/t/${tokenFor(p.slug)}`; } catch { /* TOKEN_SECRET ausente: a lista mostra o aviso */ }
  return <Shell><PersonForm person={{ ...p, story }} previews={previews} link={link} /></Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-5 pb-24">
      <Link href="/admin/pessoas" className="text-sm underline">← Pessoas</Link>
      {children}
    </main>
  );
}
