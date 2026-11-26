"use server";
import { createHash, randomBytes } from "node:crypto";
import { getGame, POINTS } from "@/lib/game";
import { slotFor } from "@/lib/people";
import { currentModerator } from "@/lib/session";
import { db } from "@/lib/supabase";
import { REACTIONS, STICKERS } from "@/lib/types";

// Robôs do simulador: slug "sim-*". Jogam direto no banco (sem IA), para ensaiar ritmo, cores e final.
const NAMES = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fê", "Gabi", "Hugo", "Iza", "Jota", "Kaká", "Léo", "Mari", "Nina", "Otto", "Pri", "Quel", "Rafa", "Sá", "Téo", "Uli", "Vivi", "Wil", "Xande", "Yas", "Zeca", "Alê", "Babi", "Cadu", "Dani", "Enzo", "Flor", "Guga", "Helô", "Ivo", "Jana", "Kiko", "Lari", "Malu", "Nando", "Olga", "Pipo", "Rê", "Sol", "Tati", "Val", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gil", "Íris", "Juca", "Lia", "Mau", "Nara", "Pedro", "Rosa", "Tito"];
const WORDS = ["Calma", "Afiada", "Generosa", "Curioso", "Leal", "Engraçado", "Focada", "Criativo", "Parceira", "Incansável"];
const COMMENTS = ["Que orgulho de trabalhar com você!", "Esse momento foi épico demais 🚀", "Você salvou o projeto, sério", "Kkkkk lembro disso, que caos lindo",
  "Obrigado pela paciência comigo esse ano", "Ninguém faz isso como você", "Aprendi demais com você", "Seu café continua horrível, mas você é incrível 😂",
  "Você deixa o time mais leve", "Que venha 2027 com mais disso!", "Lenda viva do time", "Você é a calma no meio do incêndio"];
const CAPSULES = ["Quero que a gente continue tendo tempo pra aprender, não só entregar.", "Mais clareza nas prioridades e menos mudança de rota no meio do sprint.",
  "Que a gente não perca esse clima de parceria quando o time crescer.", "Mais reconhecimento de quem faz o trabalho invisível.",
  "Plano de carreira mais claro para quem é técnico e não quer virar gestor.", "Mais encontros presenciais, eles fazem muita diferença."];
const REFS = ["moment:0", "moment:1", "number:0", "words", "quote:0"];
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

async function guard() { if (!(await currentModerator())) throw new Error("sem permissão"); }

export async function simCreate(n: number) {
  await guard();
  const supa = db();
  const { count: existing } = await supa.from("people").select("id", { count: "exact", head: true }).like("slug", "sim-%");
  const { count: total } = await supa.from("planets").select("id", { count: "exact", head: true });
  const start = existing ?? 0;
  for (let k = 0; k < Math.min(n, 70); k++) {
    const i = start + k;
    const nick = `${NAMES[i % NAMES.length]}${i >= NAMES.length ? i : ""} 🤖`;
    const story = {
      headline: pick(["2026 foi de foguete 🚀", "O ano em que tudo mudou", "Discreto(a), mas essencial"]),
      moments: [{ title: pick(["O grande lançamento", "A migração impossível", "O hackathon"]), text: "Um momento que o time não esquece." }, { title: "Mentoria", text: "Ajudou gente nova a voar." }],
      numbers: [{ value: String(10 + Math.floor(Math.random() * 90)), label: pick(["PRs revisados", "cafés com o time", "bugs caçados"]) }],
      words: [...new Set([pick(WORDS), pick(WORDS), pick(WORDS)])],
      quotes: [{ text: "Sempre topa ajudar, mesmo na correria.", from: pick(NAMES) }],
      thanks: "Obrigado por fazer parte desse ano!",
    };
    const slug = `sim-${String(i + 1).padStart(2, "0")}`;
    const { data } = await supa.from("people").insert({
      slug, name: `${NAMES[i % NAMES.length]} Robô`, nickname: nick, story, consent_at: new Date().toISOString(),
      token_hash: createHash("sha256").update(randomBytes(16)).digest("hex"),
    }).select("id").single();
    if (!data) continue;
    const s = slotFor((total ?? 0) + k);
    await supa.from("planets").insert({ id: data.id, nickname: nick, color: s.color, x: s.x, y: s.y, lit_at: new Date().toISOString() });
  }
}

export type SimReport = { ok: boolean; message: string; greens: number; total: number; phase: string; feed: string[] };

/**
 * Uma rodada de simulação, numa chamada só: robôs mandam `count` interações (gravadas em lote),
 * a energia é recalculada e, se todos ficarem verdes, os robôs escrevem as cápsulas.
 * Se o jogo estiver no lobby, dá a largada sozinho.
 */
export async function simRound(count: number, untilGreen = false): Promise<SimReport> {
  await guard();
  const supa = db();
  const fail = (message: string): SimReport => ({ ok: false, message, greens: 0, total: 0, phase: "?", feed: [] });
  try {
    let game = await getGame();
    if (game.phase === "finale") return fail("O jogo está no Final. Use 🔁 Recomeçar o jogo na Torre de controle.");
    if (game.phase === "lobby") {
      await supa.from("game").update({ phase: "playing", started_at: new Date().toISOString() }).eq("id", 1);
      game = await getGame();
    }
    const { data: bots, error: eb } = await supa.from("people").select("id").like("slug", "sim-%");
    if (eb) return fail(`Ler robôs: ${eb.message}`);
    const ids = (bots ?? []).map((b) => b.id);
    if (!ids.length) return fail("Nenhum robô. Crie robôs primeiro.");
    await supa.from("planets").update({ lit_at: new Date().toISOString() }).in("id", ids).is("lit_at", null);

    let sent = 0;
    let feed: string[] = [];
    for (let round = 0; round < (untilGreen ? 40 : 1); round++) {
      const { data: planets, error: ep } = await supa.from("planets").select("id, energy");
      if (ep) return fail(`Ler planetas: ${ep.message}`);
      const ps = planets ?? [];
      const needy = ps.filter((p) => p.energy < game.green_at).sort((a, b) => a.energy - b.energy);
      if (game.phase !== "playing" || needy.length === 0) break;

      const seen = new Set<string>();
      type Row = { from_id: string; to_id: string; kind: string; status: string; points: number; xp: number; sticker: string | null; item_ref: string | null; body: string | null; moderation: object };
      const rows: Row[] = [];
      for (let k = 0; k < count; k++) {
        const from = pick(ids);
        const pool = Math.random() < 0.6 ? needy.slice(0, 15) : ps;
        const to = pick(pool.filter((p) => p.id !== from))?.id;
        if (!to) continue;
        const r = Math.random();
        const kind = r < 0.45 ? "reaction" : r < 0.65 ? "sticker" : r < 0.9 ? "comment" : "text";
        const sticker = kind === "reaction" ? pick(REACTIONS) : kind === "sticker" ? pick(STICKERS).id : null;
        const item_ref = kind === "reaction" || kind === "comment" ? pick(REFS) : null;
        if (kind === "reaction") {
          const key = `${from}|${to}|${item_ref}|${sticker}`;
          if (seen.has(key)) continue;
          seen.add(key);
        }
        rows.push({
          from_id: from, to_id: to, kind, status: "approved", points: POINTS[kind], xp: POINTS[kind] * 2, sticker, item_ref,
          body: kind === "comment" || kind === "text" ? pick(COMMENTS) : null, moderation: { layer: "simulador" },
        });
      }
      let { data: inserted, error } = await supa.from("messages").insert(rows).select("id, from_id, to_id");
      if (error?.code === "23505") {   // reação que já existia de uma rodada anterior: manda o lote sem reações
        ({ data: inserted, error } = await supa.from("messages").insert(rows.filter((r) => r.kind !== "reaction")).select("id, from_id, to_id"));
      }
      if (error) return fail(`Gravar mensagens: ${error.code} ${error.message}`);
      const msgs = inserted ?? [];
      sent += msgs.length;
      const { data: names } = await supa.from("planets").select("id, nickname");
      const nick = new Map((names ?? []).map((n) => [n.id, n.nickname]));
      feed = msgs.slice(-12).reverse().map((m) => {
        const r = rows.find((x) => x.from_id === m.from_id && x.to_id === m.to_id);
        const what = !r ? "☄️" : r.kind === "reaction" ? `reagiu ${r.sticker}` : r.kind === "sticker" ? `deu o título ${STICKERS.find((x) => x.id === r.sticker)?.emoji ?? "✨"}` : `“${r.body}”`;
        return `${nick.get(m.from_id) ?? "?"} → ${nick.get(m.to_id) ?? "?"}: ${what}`;
      });
      if (msgs.length) {
        const { error: ec } = await supa.from("comets").insert(msgs);
        if (ec) return fail(`Gravar cometas: ${ec.code} ${ec.message}`);
      }
      // recalcula energia/XP de todo mundo que mandou ou recebeu (e encerra o jogo se todos ficaram verdes)
      for (const pid of new Set(msgs.flatMap((m) => [m.from_id, m.to_id]))) {
        const { error: er } = await supa.rpc("recompute", { receiver: pid, giver: pid });
        if (er) return fail(`Recalcular energia: ${er.code} ${er.message}`);
      }
      game = await getGame();
    }

    if (game.phase === "capsule") {
      const { data: done } = await supa.from("capsules").select("person_id").in("person_id", ids);
      const have = new Set((done ?? []).map((c) => c.person_id));
      const caps = ids.filter((id) => !have.has(id)).map((id) => ({
        person_id: id, para_mim: "Querido eu de 2027: espero que você tenha descansado e aprendido algo novo.",
        para_empresa: Math.random() < 0.8 ? pick(CAPSULES) : null,
      }));
      if (caps.length) await supa.from("capsules").insert(caps);
    }

    const { data: after } = await supa.from("planets").select("energy");
    const greens = (after ?? []).filter((p) => p.energy >= game.green_at).length;
    const total = after?.length ?? 0;
    const msg = game.phase === "capsule"
      ? `🎉 ${sent} interações. TODOS VERDES! Robôs escreveram as cápsulas. Agora: 🎬 Grande revelação na Torre.`
      : `✓ ${sent} interações enviadas. ${greens}/${total} planetas verdes.${greens < total ? "" : ""}`;
    return { ok: true, message: msg, greens, total, phase: game.phase, feed };
  } catch (e) {
    console.error("[simulador]", e);
    return fail(e instanceof Error ? e.message : String(e));
  }
}

/** Apaga os robôs (e tudo que eles mandaram/receberam) e recalcula a energia das pessoas reais. */
export async function simClear() {
  await guard();
  const supa = db();
  await supa.from("people").delete().like("slug", "sim-%");
  const { data: ps } = await supa.from("planets").select("id");
  for (const p of ps ?? []) await supa.rpc("recompute", { receiver: p.id, giver: p.id });
}
