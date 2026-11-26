import Link from "next/link";
import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import { energyColor, level } from "@/lib/colors";
import { getGame } from "@/lib/game";
import { loadProfile } from "@/lib/profile";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

export default async function Eu() {
  const me = await currentPerson();
  if (!me) redirect("/");
  const [game, profile, { data: planet }] = await Promise.all([
    getGame(),
    loadProfile(me.id, me.id, true),
    db().from("planets").select("energy, xp").eq("id", me.id).single(),
  ]);
  if (!profile) redirect("/");
  const color = energyColor(planet?.energy ?? 0, game.green_at);
  const lvl = level(planet?.xp ?? 0);
  const cta = game.phase === "lobby" ? "Embarcar na nave 🚀" : game.phase === "finale" ? "Ver meu filme 🎬" : "Jogar 🚀";

  return (
    <main className="mx-auto max-w-md px-4 pb-32 pt-[max(env(safe-area-inset-top),20px)]">
      <p className="mb-2 text-center text-xs uppercase tracking-widest text-muted">Seu planeta · {lvl.name}</p>
      <div className="mb-4 rounded-2xl bg-white/5 p-3 text-center text-sm">
        <div className="mb-1 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, ((planet?.energy ?? 0) / game.green_at) * 100)}%`, background: color }} />
        </div>
        💚 <b>{Math.min(planet?.energy ?? 0, game.green_at)}/{game.green_at}</b> de energia recebida
        <span className="text-muted"> · fica verde quando o time te visita · ⭐ {planet?.xp ?? 0} XP é o que você dá</span>
      </div>
      <ProfileView data={profile} mode={{ kind: "self" }} color={color} />
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-space via-space/90 to-transparent p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Link href={game.phase === "finale" ? "/final" : "/universo"}
          className="mx-auto block max-w-md rounded-full bg-accent py-4 text-center text-lg font-black text-black shadow-[0_0_40px_#ffcf5a88]">
          {cta}
        </Link>
      </div>
    </main>
  );
}
