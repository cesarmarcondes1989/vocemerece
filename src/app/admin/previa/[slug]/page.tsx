import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PersonalMotion from "@/components/PersonalMotion";
import { personalFinale } from "@/lib/finale";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";

export const maxDuration = 60;

/** Prévia do filme pessoal de alguém, com o que já recebeu até agora. */
export default async function PreviaPessoa({ params }: PageProps<"/admin/previa/[slug]">) {
  if (!(await currentModerator())) redirect("/admin");
  const { slug } = await params;
  const { data } = await db().from("people").select("id").eq("slug", slug).maybeSingle();
  const finale = data && (await personalFinale(data.id, { preview: true }));
  if (!finale) notFound();
  return (
    <>
      <div className="fixed left-1/2 top-6 z-30 flex -translate-x-1/2 gap-2 rounded-full bg-black/70 px-3 py-1 text-xs backdrop-blur">
        <span className="text-accent">PRÉVIA · {finale.nickname}</span>
        <Link href="/admin" className="underline">sair</Link>
      </div>
      <PersonalMotion data={finale} />
    </>
  );
}
