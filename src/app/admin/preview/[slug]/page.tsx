import Link from "next/link";
import { notFound } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { loadProfile } from "@/lib/profile";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";

export default async function Preview({ params }: PageProps<"/admin/preview/[slug]">) {
  if (!(await currentModerator())) notFound();
  const { slug } = await params;
  const { data } = await db().from("people").select("id").eq("slug", slug).maybeSingle();
  const profile = data && (await loadProfile(data.id, "admin"));
  if (!profile) notFound();
  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/admin" className="mb-3 inline-block text-sm underline">← Torre de controle</Link>
      <ProfileView data={profile} mode={{ kind: "visit", canInteract: false, onXp: () => {} }} />
    </main>
  );
}
