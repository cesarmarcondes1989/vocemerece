import { connection } from "next/server";
import { db } from "@/lib/supabase";

/**
 * Retrato do universo (sem dado pessoal: só planetas, cometas recentes e fase do jogo).
 * Os celulares consultam a cada ~3s e a CDN da Vercel serve do cache por 2s:
 * 60 pessoas = ~0,5 consulta/s no Supabase, em vez de milhares de eventos de Realtime.
 */
export async function GET() {
  await connection();   // sempre em tempo de request (o cache fica só na CDN, por 2s)
  const supa = db();
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const [{ data: game }, { data: planets }, { data: comets }] = await Promise.all([
    supa.from("game").select("phase, green_at, sender_cap, started_at, all_green_at, finale_at").eq("id", 1).single(),
    supa.from("planets").select("id, nickname, color, x, y, size, lit_at, energy, received, senders, xp, visited"),
    supa.from("comets").select("id, from_id, to_id, created_at").gte("created_at", since).order("created_at"),
  ]);
  return Response.json(
    { game, planets, comets, at: new Date().toISOString() },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=2" } },
  );
}
