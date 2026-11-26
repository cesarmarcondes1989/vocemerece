#!/usr/bin/env node
// Importa pessoas + histórias para o Supabase e gera out/tags.csv (URL de cada tag NFC).
// Uso: node --env-file=.env.local scripts/import.mjs [--dry]
//
// Entrada:
//   content/people.csv          slug,name,nickname,color,is_moderator
//   content/stories/<slug>.json história revisada (ver content/stories/exemplo.json)
//   content/photos/<arquivo>    fotos citadas nas histórias ("photo": "arquivo.jpg")
import { createHash, createHmac } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCsv, toCsv } from "./csv.mjs";

const DRY = process.argv.includes("--dry");
const { NEXT_PUBLIC_SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: KEY, TOKEN_SECRET, PUBLIC_BASE_URL } = process.env;
if (!TOKEN_SECRET || TOKEN_SECRET.length < 32) throw new Error("Defina TOKEN_SECRET (mín. 32 chars) no .env.local");
if (!PUBLIC_BASE_URL) throw new Error("Defina PUBLIC_BASE_URL (ex.: https://universo.suaempresa.com)");

const PALETTE = ["#ff7a59", "#ffcf5a", "#7ce0a3", "#5ac8ff", "#a78bfa", "#ff6fb5", "#f59e0b", "#34d399", "#60a5fa", "#f472b6", "#c084fc", "#fb7185"];
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Token determinístico: reimportar não muda a URL da tag já gravada. Para invalidar tudo, troque TOKEN_SECRET.
const tokenFor = (slug) => createHmac("sha256", TOKEN_SECRET).update(slug).digest("base64url").slice(0, 22);
const sha = (t) => createHash("sha256").update(t).digest("hex");

// Espiral dourada: espalha os planetas de forma orgânica, sem sobreposição
function position(i, n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const r = 0.44 * Math.sqrt((i + 0.5) / n);
  return { x: 0.5 + r * Math.cos(i * golden), y: 0.5 + r * Math.sin(i * golden) };
}

const people = parseCsv(readFileSync("content/people.csv", "utf8"));
const supa = createClient(URL_, KEY, { auth: { persistSession: false } });
const tags = [];
let problems = 0;

for (const [i, p] of people.entries()) {
  if (!/^[a-z0-9-]+$/.test(p.slug)) { console.error(`✗ slug inválido: "${p.slug}"`); problems++; continue; }
  const storyFile = join("content/stories", `${p.slug}.json`);
  const story = existsSync(storyFile) ? JSON.parse(readFileSync(storyFile, "utf8")) : {};
  if (!existsSync(storyFile)) console.warn(`! ${p.slug}: sem história (content/stories/${p.slug}.json)`);

  for (const m of story.moments ?? []) {
    if (!m.photo || m.photo.includes("/")) continue;
    const local = join("content/photos", m.photo);
    if (!existsSync(local)) { console.error(`✗ ${p.slug}: foto não encontrada ${local}`); problems++; delete m.photo; continue; }
    const remote = `${p.slug}/${m.photo}`;
    if (!DRY) {
      const { error } = await supa.storage.from("stories").upload(remote, readFileSync(local), {
        upsert: true, contentType: MIME[extname(local).toLowerCase()] ?? "image/jpeg",
      });
      if (error) { console.error(`✗ upload ${local}:`, error.message); problems++; }
    }
    m.photo = remote;
  }

  const token = tokenFor(p.slug);
  const { x, y } = position(i, people.length);
  const row = {
    slug: p.slug, name: p.name, nickname: p.nickname || p.name.split(" ")[0],
    is_moderator: /^(1|true|sim|s|x)$/i.test(p.is_moderator ?? ""), token_hash: sha(token), story,
  };

  if (!DRY) {
    const { data, error } = await supa.from("people").upsert(row, { onConflict: "slug" }).select("id").single();
    if (error) { console.error(`✗ ${p.slug}:`, error.message); problems++; continue; }
    const { data: existing } = await supa.from("planets").select("id").eq("id", data.id).maybeSingle();
    const planet = { id: data.id, nickname: row.nickname, color: p.color || PALETTE[i % PALETTE.length] };
    // posição só na criação (pra não embaralhar o mapa depois que o evento começou)
    const { error: e2 } = await supa.from("planets").upsert(existing ? planet : { ...planet, x, y });
    if (e2) { console.error(`✗ planeta ${p.slug}:`, e2.message); problems++; }
  }

  tags.push({ slug: p.slug, nome: p.name, apelido: row.nickname, url: `${PUBLIC_BASE_URL.replace(/\/$/, "")}/t/${token}` });
  console.log(`✓ ${p.slug}`);
}

mkdirSync("out", { recursive: true });
writeFileSync("out/tags.csv", toCsv(tags));
console.log(`\n${tags.length} pessoas · ${problems} problema(s) · URLs das tags em out/tags.csv${DRY ? " (DRY RUN: nada foi gravado)" : ""}`);
console.log("⚠️  out/tags.csv é como uma senha de cada pessoa. Não suba pro git nem mande no grupo.");
