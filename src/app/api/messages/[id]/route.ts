import { z } from "zod";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";

const Body = z.object({ action: z.enum(["read", "hide", "report"]), reason: z.string().max(300).optional() });

// Destinatário pode marcar como lida, ocultar ou denunciar (denúncia oculta e manda para revisão).
export async function PATCH(req: Request, ctx: RouteContext<"/api/messages/[id]">) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "ação inválida" }, { status: 400 });

  const supa = db();
  const { data: msg } = await supa.from("messages").select("id, to_id").eq("id", id).maybeSingle();
  if (!msg || msg.to_id !== me.id) return Response.json({ error: "não encontrada" }, { status: 404 });

  const { action, reason } = parsed.data;
  if (action === "read") await supa.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (action === "hide") await supa.from("messages").update({ hidden: true }).eq("id", id);
  if (action === "report") {
    await supa.from("reports").insert({ message_id: id, reporter_id: me.id, reason: reason ?? null });
    await supa.from("messages").update({ hidden: true, status: "review" }).eq("id", id);
    await supa.from("comets").delete().eq("id", id);
  }
  return Response.json({ ok: true });
}
