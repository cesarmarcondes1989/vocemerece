"use server";
import { createHash, randomBytes } from "node:crypto";
import { deliver, getGame, POINTS } from "@/lib/game";
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

/** Uma rodada: `count` robôs fazem uma ação cada. Chamada a cada ~2s pela tela do simulador. */
export async function simTick(count: number) {
  await guard();
  const supa = db();
  const game = await getGame();
  const [{ data: bots }, { data: planets }] = await Promise.all([
    supa.from("people").select("id").like("slug", "sim-%"),
    supa.from("planets").select("id, energy"),
  ]);
  const ids = (bots ?? []).map((b) => b.id);
  const ps = planets ?? [];
  const greens = ps.filter((p) => p.energy >= game.green_at).length;
  const status = { phase: game.phase, greens, total: ps.length, bots: ids.length };
  if (!ids.length || game.phase === "lobby" || game.phase === "finale") return status;

  if (game.phase === "capsule") {
    const { data: done } = await supa.from("capsules").select("person_id").in("person_id", ids);
    const have = new Set((done ?? []).map((c) => c.person_id));
    const rows = ids.filter((id) => !have.has(id)).map((id) => ({
      person_id: id, para_mim: "Querido eu de 2027: espero que você tenha descansado e aprendido algo novo.",
      para_empresa: Math.random() < 0.8 ? pick(CAPSULES) : null,
    }));
    if (rows.length) await supa.from("capsules").insert(rows);
    return status;
  }

  const needy = [...ps].filter((p) => p.energy < game.green_at).sort((a, b) => a.energy - b.energy);
  for (let k = 0; k < count; k++) {
    const from = pick(ids);
    const pool = Math.random() < 0.5 && needy.length ? needy.slice(0, 10) : ps;
    const to = pick(pool.filter((p) => p.id !== from))?.id;
    if (!to) continue;
    const r = Math.random();
    const kind = r < 0.5 ? "reaction" : r < 0.65 ? "sticker" : r < 0.9 ? "comment" : "text";
    const { data: msg } = await supa.from("messages").insert({
      from_id: from, to_id: to, kind, status: "approved", points: POINTS[kind], xp: POINTS[kind] * 2,
      sticker: kind === "reaction" ? pick(REACTIONS) : kind === "sticker" ? pick(STICKERS).id : null,
      item_ref: kind === "reaction" || kind === "comment" ? pick(REFS) : null,
      body: kind === "comment" || kind === "text" ? pick(COMMENTS) : null,
      moderation: { layer: "simulador" },
    }).select("id, from_id, to_id").maybeSingle();     // reação repetida bate no índice único: só ignora
    if (msg) await deliver(msg);
  }
  return status;
}

/** Apaga os robôs (e tudo que eles mandaram/receberam) e recalcula a energia das pessoas reais. */
export async function simClear() {
  await guard();
  const supa = db();
  await supa.from("people").delete().like("slug", "sim-%");
  const { data: ps } = await supa.from("planets").select("id");
  for (const p of ps ?? []) await supa.rpc("recompute", { receiver: p.id, giver: p.id });
}
