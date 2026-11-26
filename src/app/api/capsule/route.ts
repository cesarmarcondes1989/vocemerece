import { z } from "zod";
import { blocklistHit } from "@/lib/moderation/blocklist";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({
  paraMim: z.string().trim().min(10).max(1500),
  paraEmpresa: z.string().trim().max(1500).optional().nullable(),
});

/**
 * Cápsula do tempo. `para_mim` é privada (só a pessoa relê em dez/2027).
 * `para_empresa` entra ANÔNIMA na síntese da diretoria. Sem IA aqui: é privada e não vai pra ninguém do time.
 */
export async function POST(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escreve pelo menos uma frase pra você mesmo(a) 💌" }, { status: 400 });
  const { paraMim, paraEmpresa } = parsed.data;
  if (paraEmpresa && blocklistHit(paraEmpresa))
    return Response.json({ error: "Opa, tem uma palavra aí que não vai pegar bem na diretoria 😅" }, { status: 400 });

  const { error } = await db().from("capsules").upsert({
    person_id: me.id, para_mim: paraMim, para_empresa: paraEmpresa || null, created_at: new Date().toISOString(),
  });
  if (error) return Response.json({ error: "falha ao lacrar a cápsula" }, { status: 500 });
  return Response.json({ ok: true });
}

export async function GET() {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const { data } = await db().from("capsules").select("para_mim, para_empresa").eq("person_id", me.id).maybeSingle();
  return Response.json({ capsule: data });
}
