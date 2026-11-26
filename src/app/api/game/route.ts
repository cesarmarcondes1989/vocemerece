import { connection } from "next/server";
import { db } from "@/lib/supabase";

/** Só a fase do jogo: consulta levíssima que TODAS as páginas do jogador fazem a cada 3s. */
export async function GET() {
  await connection();
  const { data } = await db().from("game").select("phase").eq("id", 1).maybeSingle();
  return Response.json({ phase: data?.phase ?? null }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=2, stale-while-revalidate=2" } });
}
