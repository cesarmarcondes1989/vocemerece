import Link from "next/link";
import { currentPerson } from "@/lib/session";

export default async function Home({ searchParams }: PageProps<"/">) {
  const me = await currentPerson();
  const { erro } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-7xl">🪐</div>
      <h1 className="text-3xl font-bold">Universo 2026</h1>
      {erro && <p className="rounded-xl bg-red-500/15 px-4 py-2 text-red-200">Hmm, esse planeta não está no nosso mapa.</p>}
      {me ? (
        <>
          <p className="text-muted">Bem-vindo(a) de volta, {me.nickname}.</p>
          <div className="flex gap-3">
            <Link href="/eu" className="rounded-full border border-white/20 px-5 py-3">Meu planeta</Link>
            <Link href="/universo" className="rounded-full bg-accent px-5 py-3 font-semibold text-black">Jogar 🚀</Link>
          </div>
        </>
      ) : (
        <p className="text-muted">Encoste o celular no seu planetinha para começar ✨</p>
      )}
      <Link href="/admin" className="fixed bottom-6 text-xs text-muted/60 underline">sou gestor(a)</Link>
    </main>
  );
}
