import { z } from "zod";
import { deliver, getGame, POINTS, xpFor } from "@/lib/game";
import { moderate } from "@/lib/moderation";
import { currentPerson } from "@/lib/session";
import { db } from "@/lib/supabase";
import { REACTIONS, STICKERS } from "@/lib/types";

const Body = z.object({
  to: z.string().uuid(),
  kind: z.enum(["text", "sticker", "photo", "reaction", "comment"]),
  body: z.string().trim().max(300).optional().nullable(),
  sticker: z.string().optional().nullable(),        // id do sticker, ou o emoji da reação
  itemRef: z.string().max(80).optional().nullable(),
  mediaPath: z.string().optional().nullable(),
  mediaType: z.string().optional().nullable(),
});

const LIMIT_PER_HOUR = 120;     // interações com texto/foto por hora (reações não contam)

export async function POST(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  if (!me.consent_at) return Response.json({ error: "aceite os termos primeiro" }, { status: 403 });

  const game = await getGame();
  if (game.phase === "lobby") return Response.json({ error: "O jogo ainda não começou! Aguenta aí 🚀" }, { status: 409 });
  if (game.phase === "finale") return Response.json({ error: "O jogo acabou! Vai ver seu filme 🎬" }, { status: 409 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "mensagem inválida" }, { status: 400 });
  const m = parsed.data;

  if (m.to === me.id) return Response.json({ error: "autoelogio é lindo, mas manda pra outra pessoa 😄" }, { status: 400 });
  if ((m.kind === "text" || m.kind === "comment") && !m.body) return Response.json({ error: "mensagem vazia" }, { status: 400 });
  if (m.kind === "sticker" && !STICKERS.some((s) => s.id === m.sticker))
    return Response.json({ error: "sticker desconhecido" }, { status: 400 });
  if (m.kind === "reaction" && (!REACTIONS.includes(m.sticker as (typeof REACTIONS)[number]) || !m.itemRef))
    return Response.json({ error: "reação inválida" }, { status: 400 });
  if (m.kind === "photo" && !m.mediaPath?.startsWith(`${me.id}/`))
    return Response.json({ error: "arquivo inválido" }, { status: 400 });

  const supa = db();
  if (m.kind !== "reaction") {
    const since = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count } = await supa.from("messages").select("id", { count: "exact", head: true })
      .eq("from_id", me.id).neq("kind", "reaction").gte("created_at", since);
    if ((count ?? 0) >= LIMIT_PER_HOUR)
      return Response.json({ error: "Calma, foguete! Respira um minutinho ☄️" }, { status: 429 });
  }

  // Reação não tem texto: não precisa de IA. O resto passa pelo guardrail.
  const verdict = m.kind === "reaction"
    ? { layer: "reaction", decision: "allow" as const, reason: "Reação", suggestion: null }
    : await moderate({ kind: m.kind, body: m.body, mediaPath: m.mediaPath, mediaType: m.mediaType });
  const status = verdict.decision === "allow" ? "approved" : verdict.decision === "block" ? "rejected" : "review";

  const { data: msg, error } = await supa
    .from("messages")
    .insert({
      from_id: me.id, to_id: m.to, kind: m.kind, body: m.body ?? null, sticker: m.sticker ?? null,
      item_ref: m.itemRef ?? null, media_path: m.mediaPath ?? null, status, moderation: verdict,
      points: POINTS[m.kind], xp: await xpFor(m.kind, m.to, game),
    })
    .select("id, from_id, to_id, xp")
    .single();
  if (error?.code === "23505") return Response.json({ error: "Você já reagiu assim 😉" }, { status: 409 });
  if (error || !msg) return Response.json({ error: "falha ao enviar" }, { status: 500 });

  if (status === "approved") await deliver(msg);
  if (status === "rejected" && m.mediaPath) await supa.storage.from("uploads").remove([m.mediaPath]);

  return Response.json({
    id: msg.id, status, xp: status === "approved" ? msg.xp : 0,
    reason: status === "approved" ? null : verdict.reason,
    suggestion: verdict.suggestion,
  });
}

/** Desfazer uma reação (toque de novo no emoji). */
export async function DELETE(req: Request) {
  const me = await currentPerson();
  if (!me) return Response.json({ error: "sem planeta" }, { status: 401 });
  const { to, itemRef, emoji } = Object.fromEntries(new URL(req.url).searchParams);
  const supa = db();
  const { data: msg } = await supa.from("messages").delete()
    .match({ from_id: me.id, to_id: to, item_ref: itemRef, sticker: emoji, kind: "reaction" })
    .select("id, from_id, to_id").maybeSingle();
  if (msg) await supa.rpc("recompute", { receiver: msg.to_id, giver: msg.from_id });
  return Response.json({ ok: true });
}
