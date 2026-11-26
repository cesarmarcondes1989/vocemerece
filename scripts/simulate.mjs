#!/usr/bin/env node
/**
 * 🤖 Simulador do Universo 2026: robôs jogando de verdade, pela API, enquanto você assiste.
 *
 * USE UM PROJETO SUPABASE DE TESTE (ou rode antes de importar as pessoas reais).
 *
 *   node --env-file=.env.local scripts/simulate.mjs setup [--n 59]
 *       cria sim-00 (você, gestor) + N robôs com perfis falsos. Imprime o SEU link.
 *
 *   node --env-file=.env.local scripts/simulate.mjs play [--url http://localhost:3000] [--speed 1] [--so-reacoes] [--malcriados]
 *       os robôs entram, esperam a largada (você dá no /admin) e jogam até todo mundo ficar verde.
 *       Depois escrevem cápsulas. --so-reacoes: não chama a IA (zero custo). --malcriados: 5% de mensagens
 *       que DEVEM ser barradas, para testar o guardrail.
 *
 *   node --env-file=.env.local scripts/simulate.mjs reset
 *       apaga todos os sim-* e volta o jogo para o lobby.
 */
import { createHash, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [, , cmd = "help", ...rest] = process.argv;
const flag = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = rest[i + 1];
  return v === undefined || v.startsWith("--") ? true : v;
};
const { NEXT_PUBLIC_SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: KEY, TOKEN_SECRET } = process.env;
if (!URL_ || !KEY || !TOKEN_SECRET) throw new Error("Precisa de NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e TOKEN_SECRET no .env.local");
const supa = createClient(URL_, KEY, { auth: { persistSession: false } });
const tokenFor = (slug) => createHmac("sha256", TOKEN_SECRET).update(slug).digest("base64url").slice(0, 22);
const sha = (t) => createHash("sha256").update(t).digest("hex");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const NAMES = ["Ana", "Bia", "Caio", "Duda", "Edu", "Fê", "Gabi", "Hugo", "Iza", "Jota", "Kaká", "Léo", "Mari", "Nina", "Otto", "Pri", "Quel", "Rafa", "Sá", "Téo", "Uli", "Vivi", "Wil", "Xande", "Yas", "Zeca", "Alê", "Babi", "Cadu", "Dani", "Enzo", "Flor", "Guga", "Helô", "Ivo", "Jana", "Kiko", "Lari", "Malu", "Nando", "Olga", "Pipo", "Rê", "Sol", "Tati", "Val", "Bruno", "Carla", "Diego", "Elisa", "Fábio", "Gil", "Íris", "Juca", "Lia", "Mau", "Nara", "Pedro", "Rosa", "Tito"];
const WORDS = ["Calma", "Afiada", "Generosa", "Curioso", "Leal", "Engraçado", "Focada", "Criativo", "Parceira", "Incansável"];
const COMMENTS = [
  "Que orgulho de trabalhar com você!", "Esse momento foi épico demais 🚀", "Você salvou o projeto, sério", "Kkkkk lembro disso, que caos lindo",
  "Obrigado pela paciência comigo esse ano", "Ninguém faz isso como você", "Melhor dupla de 2026!", "Aprendi demais com você",
  "Seu café continua horrível, mas você é incrível 😂", "Você deixa o time mais leve", "Que venha 2027 com mais disso!", "Brabo(a) demais",
  "Lenda viva do time", "Isso aqui merecia um troféu", "Obrigado por segurar a barra naquela semana", "Você é a calma no meio do incêndio",
];
const TEXTS = [
  "Obrigado por cada code review cuidadoso. Você me fez crescer muito em 2026!", "Meu momento favorito com você foi aquela reunião que virou piada interna 😂",
  "Em 2027 quero aprender ainda mais contigo. Valeu por tudo!", "Você é a pessoa que todo mundo quer no time quando dá ruim.",
];
const NAUGHTY = ["seu fdp kkkk", "você é burro demais, sério", "manda nudes", "ninguém aguenta você"];
const CAPSULES = [
  "Quero que a gente continue tendo tempo pra aprender, não só entregar.", "Mais clareza nas prioridades e menos mudança de rota no meio do sprint.",
  "Que a gente não perca esse clima de parceria quando o time crescer.", "Gostaria de ver mais reconhecimento público de quem faz o trabalho invisível.",
  "Plano de carreira mais claro para quem é técnico e não quer virar gestor.", "Mais encontros presenciais, eles fazem muita diferença.",
];
const REACTIONS = ["❤️", "🔥", "👏", "😂", "🚀", "🤯"];
const STICKERS = ["foguete", "cafe", "cerebro", "salvou", "zoeira", "brilhou", "calma", "abraco", "bug", "dj", "planta", "2027"];
const REFS = ["photo", "moment:0", "moment:1", "number:0", "words", "quote:0"];

async function setup() {
  const n = Number(flag("n", 59));
  const rows = [{ slug: "sim-00", name: "Você (teste)", nickname: "Você", is_moderator: true }];
  for (let i = 1; i <= n; i++) rows.push({ slug: `sim-${String(i).padStart(2, "0")}`, name: `${NAMES[(i - 1) % NAMES.length]} Robô`, nickname: `${NAMES[(i - 1) % NAMES.length]}${i > NAMES.length ? i : ""}`, is_moderator: false });
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (const [i, r] of rows.entries()) {
    const story = {
      headline: pick(["2026 foi de foguete 🚀", "O ano em que tudo mudou", "Discreto(a), mas essencial", "Rei/Rainha das entregas"]),
      moments: [{ title: pick(["O grande lançamento", "A migração impossível", "O hackathon", "A virada do Q3"]), text: "Um momento que o time não esquece." },
        { title: "Mentoria", text: "Ajudou gente nova a voar sozinha." }],
      numbers: [{ value: String(10 + Math.floor(Math.random() * 90)), label: pick(["PRs revisados", "cafés com o time", "bugs caçados", "reuniões salvas"]) }],
      words: [pick(WORDS), pick(WORDS), pick(WORDS)].filter((w, j, a) => a.indexOf(w) === j),
      quotes: [{ text: "Sempre topa ajudar, mesmo na correria.", from: pick(NAMES) }],
      thanks: "Obrigado por fazer parte desse ano!",
    };
    const { data, error } = await supa.from("people").upsert({ ...r, token_hash: sha(tokenFor(r.slug)), story, consent_at: new Date().toISOString() }, { onConflict: "slug" }).select("id").single();
    if (error) throw error;
    const rad = 0.44 * Math.sqrt((i + 0.5) / rows.length);
    await supa.from("planets").upsert({ id: data.id, nickname: r.nickname, color: "#6b7cff", x: 0.5 + rad * Math.cos(i * golden), y: 0.5 + rad * Math.sin(i * golden) });
  }
  await supa.from("game").update({ phase: "lobby", started_at: null, all_green_at: null, finale_at: null, stats: null }).eq("id", 1);
  const base = (flag("url", process.env.PUBLIC_BASE_URL || "http://localhost:3000")).replace(/\/$/, "");
  console.log(`✓ ${rows.length} planetas criados (você + ${n} robôs). Jogo no LOBBY.\n`);
  console.log(`👉 Seu link (gestor, PIN = ADMIN_PIN):\n   ${base}/t/${tokenFor("sim-00")}\n`);
  console.log(`Agora rode: node --env-file=.env.local scripts/simulate.mjs play --url ${base}`);
}

async function play() {
  const base = flag("url", "http://localhost:3000").replace(/\/$/, "");
  const speed = Number(flag("speed", 1));
  const onlyReactions = !!flag("so-reacoes", false);
  const naughty = !!flag("malcriados", false);
  const { data: people } = await supa.from("people").select("id, slug").like("slug", "sim-%").neq("slug", "sim-00");
  if (!people?.length) throw new Error("Rode `setup` antes.");

  const stats = { ok: 0, review: 0, rejected: 0, errors: 0, lat: [], byStatus: {} };
  let universe = null;
  async function refreshUniverse() { try { universe = await (await fetch(`${base}/api/universe`)).json(); } catch { /* tenta de novo */ } }
  await refreshUniverse();
  const uTimer = setInterval(refreshUniverse, 2000);

  async function login(p) {
    const r = await fetch(`${base}/t/${tokenFor(p.slug)}`, { redirect: "manual" });
    const c = r.headers.getSetCookie().find((x) => x.startsWith("u26="));
    if (!c) throw new Error(`login falhou para ${p.slug} (status ${r.status})`);
    return c.split(";")[0];
  }

  async function call(cookie, path, body, method = "POST") {
    const t0 = Date.now();
    try {
      const r = await fetch(`${base}${path}`, { method, headers: { cookie, "content-type": "application/json" }, body: body && JSON.stringify(body) });
      stats.lat.push(Date.now() - t0);
      stats.byStatus[r.status] = (stats.byStatus[r.status] ?? 0) + 1;
      const j = await r.json().catch(() => ({}));
      if (r.ok) { if (j.status === "review") stats.review++; else if (j.status === "rejected") stats.rejected++; else stats.ok++; }
      else if (r.status >= 500) stats.errors++;
      return j;
    } catch { stats.errors++; return {}; }
  }

  async function bot(p, cookie) {
    await sleep(Math.random() * 4000);
    // entra pelo NFC aos poucos (o lobby enche ao vivo)
    while (universe?.game?.phase === "lobby") await sleep(1000);
    const greenAt = () => universe?.game?.green_at ?? 30;
    while (universe?.game?.phase === "playing") {
      await sleep((5000 + Math.random() * 15000) / speed);   // ~1 ação a cada 12s, ritmo de gente de verdade
      const others = (universe.planets ?? []).filter((x) => x.id !== p.id);
      const needy = others.filter((x) => x.energy < greenAt()).sort((a, b) => a.energy - b.energy);
      const target = Math.random() < 0.5 && needy.length ? pick(needy.slice(0, 10)) : pick(others);
      if (!target) continue;
      const roll = Math.random();
      if (naughty && roll < 0.05) await call(cookie, "/api/messages", { to: target.id, kind: "comment", body: pick(NAUGHTY), itemRef: pick(REFS) });
      else if (onlyReactions || roll < 0.55) await call(cookie, "/api/messages", Math.random() < 0.75
        ? { to: target.id, kind: "reaction", sticker: pick(REACTIONS), itemRef: pick(REFS) }
        : { to: target.id, kind: "sticker", sticker: pick(STICKERS) });
      else if (roll < 0.85) await call(cookie, "/api/messages", { to: target.id, kind: "comment", body: pick(COMMENTS), itemRef: pick(REFS) });
      else await call(cookie, "/api/messages", { to: target.id, kind: "text", body: pick(TEXTS) });
    }
    if (universe?.game?.phase === "capsule") {
      await sleep(Math.random() * 15000 / speed);
      await call(cookie, "/api/capsule", { paraMim: "Querido eu de 2027: espero que você tenha descansado e aprendido algo novo.", paraEmpresa: Math.random() < 0.8 ? pick(CAPSULES) : null });
    }
  }

  console.log(`🤖 ${people.length} robôs entrando em ${base} (velocidade ${speed}x${onlyReactions ? ", só reações" : ""}${naughty ? ", com malcriados" : ""})`);
  const cookies = [];
  for (const p of people) { cookies.push(await login(p)); }
  console.log("✓ Todos a bordo. Dê a largada em /admin (🚀).");

  const t0 = Date.now();
  const report = setInterval(() => {
    const g = universe?.game; const ps = universe?.planets ?? [];
    const greens = ps.filter((x) => x.energy >= (g?.green_at ?? 30)).length;
    const lat = [...stats.lat].sort((a, b) => a - b);
    const p = (q) => lat[Math.floor(lat.length * q)] ?? 0;
    stats.lat = lat.slice(-500);
    console.log(`[${Math.round((Date.now() - t0) / 1000)}s] fase=${g?.phase} verdes=${greens}/${ps.length} ✓${stats.ok} 🛰️${stats.review} 🚫${stats.rejected} ❌${stats.errors} p50=${p(0.5)}ms p95=${p(0.95)}ms http=${JSON.stringify(stats.byStatus)}`);
  }, 5000);

  await Promise.all(people.map((p, i) => bot(p, cookies[i])));
  clearInterval(report); clearInterval(uTimer);
  console.log("\n🏁 Robôs terminaram (todos verdes + cápsulas escritas). Agora clique em 🎬 Grande revelação no /admin.");
}

async function reset() {
  const { data } = await supa.from("people").select("id").like("slug", "sim-%");
  const ids = (data ?? []).map((p) => p.id);
  if (ids.length) {
    await supa.from("board_capsule").delete().eq("id", 1);
    await supa.from("people").delete().in("id", ids);   // cascata: planetas, mensagens, cápsulas...
  }
  await supa.from("game").update({ phase: "lobby", started_at: null, all_green_at: null, finale_at: null, stats: null }).eq("id", 1);
  console.log(`✓ ${ids.length} planetas de simulação apagados. Jogo de volta ao lobby.`);
}

const cmds = { setup, play, reset };
if (!cmds[cmd]) { console.log("Uso: simulate.mjs setup|play|reset (veja o topo do arquivo)"); process.exit(1); }
await cmds[cmd]();
