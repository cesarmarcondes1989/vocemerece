#!/usr/bin/env node
// Transforma as respostas do formulário em rascunhos de história, para um LÍDER revisar.
// Uso: node --env-file=.env.local scripts/draft-stories.mjs [--force]
//
// Entrada: content/form.csv (export do Google Forms). Precisa de uma coluna "slug" (para quem é a resposta).
//          Todas as outras colunas viram "notas". Várias respostas para a mesma pessoa são agrupadas.
// Saída:   content/stories/<slug>.json (não sobrescreve arquivos existentes sem --force)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { parseCsv } from "./csv.mjs";

const FORCE = process.argv.includes("--force");
const people = Object.fromEntries(parseCsv(readFileSync("content/people.csv", "utf8")).map((p) => [p.slug, p]));
const answers = parseCsv(readFileSync("content/form.csv", "utf8"));

const Story = z.object({
  headline: z.string(),
  moments: z.array(z.object({ title: z.string(), text: z.string(), photo: z.string().nullable() })),
  numbers: z.array(z.object({ value: z.string(), label: z.string() })),
  words: z.array(z.string()),
  quotes: z.array(z.object({ text: z.string(), from: z.string() })),
  thanks: z.string(),
});

const SYSTEM = `Você escreve roteiros curtos e emocionantes de "retrospectiva 2026" para pessoas de um time de trabalho.
Formato stories de celular: frases CURTAS, calorosas, com humor leve. PT-BR, linguagem neutra de gênero quando não souber.
Regras inegociáveis:
- USE SÓ fatos presentes nas notas. Não invente projetos, números, datas ou elogios específicos. Se faltar algo, devolva a lista vazia.
- headline: até 60 caracteres. moments: 1 a 3, title até 40 e text até 140 caracteres.
- numbers: só números citados nas notas (value curto, label até 40). words: exatamente 3 palavras se houver base, senão [].
- quotes: frases de colegas das notas, levemente editadas para caber (até 120), com "from" = primeiro nome de quem disse.
- thanks: 1 a 2 frases de agradecimento do time, até 180 caracteres. NÃO inclua "contamos com você em 2027" (a página já mostra).
- photo: só o nome de arquivo se as notas citarem um, senão null.`;

const client = new Anthropic();
const bySlug = Map.groupBy(answers, (a) => a.slug);
mkdirSync("content/stories", { recursive: true });

for (const [slug, rows] of bySlug) {
  const out = `content/stories/${slug}.json`;
  if (!people[slug]) { console.warn(`! "${slug}" não está em people.csv, pulando`); continue; }
  if (existsSync(out) && !FORCE) { console.log(`= ${slug} já tem rascunho (use --force para refazer)`); continue; }

  const notes = rows
    .map((r, i) => `Resposta ${i + 1}:\n` + Object.entries(r).filter(([k, v]) => k !== "slug" && v).map(([k, v]) => `- ${k}: ${v}`).join("\n"))
    .join("\n\n");

  const res = await client.messages.parse({
    model: process.env.STORY_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(Story) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Pessoa: ${people[slug].name} (apelido: ${people[slug].nickname})\n\n<notas>\n${notes}\n</notas>` }],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) { console.error(`✗ ${slug}: sem rascunho (${res.stop_reason})`); continue; }

  const story = res.parsed_output;
  story.moments = story.moments.map(({ photo, ...m }) => (photo ? { ...m, photo } : m));
  writeFileSync(out, JSON.stringify({ _revisado_por: "", ...story }, null, 2) + "\n");
  console.log(`✓ ${slug} → ${out}`);
}
console.log("\nAgora: líder revisa cada JSON, preenche _revisado_por, e roda scripts/import.mjs");
