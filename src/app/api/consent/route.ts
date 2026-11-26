import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

export async function POST() {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  await db().from("people").update({ consent_at: new Date().toISOString() }).eq("id", me.id);
  return Response.json({ ok: true });
}
