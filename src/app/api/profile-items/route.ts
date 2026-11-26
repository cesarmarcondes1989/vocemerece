import { z } from "zod";
import { moderate } from "@/lib/moderation";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({ text: z.string().trim().min(3).max(200), emoji: z.string().max(8).default("✨") });
const MAX_ITEMS = 6;

/** "Coisas que eu fiz e vocês não mapearam": a pessoa completa o próprio planeta. */
export async function POST(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Escreve entre 3 e 200 caracteres 🙂" }, { status: 400 });

  const supa = db();
  const { count } = await supa.from("profile_items").select("id", { count: "exact", head: true })
    .eq("person_id", me.id).neq("status", "rejected");
  if ((count ?? 0) >= MAX_ITEMS) return Response.json({ error: `Máximo de ${MAX_ITEMS} conquistas. Escolhe as melhores! 🏆` }, { status: 400 });

  const verdict = await moderate({ kind: "text", body: parsed.data.text });
  const status = verdict.decision === "allow" ? "approved" : verdict.decision === "block" ? "rejected" : "review";
  const { data, error } = await supa.from("profile_items")
    .insert({ person_id: me.id, text: parsed.data.text, emoji: parsed.data.emoji, status, moderation: verdict })
    .select("id, text, emoji, status").single();
  if (error) return Response.json({ error: "falha ao salvar" }, { status: 500 });
  return Response.json({ item: data, reason: status === "approved" ? null : verdict.reason, suggestion: verdict.suggestion });
}

export async function DELETE(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  await db().from("profile_items").delete().eq("id", id).eq("person_id", me.id);
  return Response.json({ ok: true });
}
