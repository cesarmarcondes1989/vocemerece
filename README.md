# 🪐 Universo 2026

Cada pessoa do time ganha um **planetinha impresso em 3D com NFC**. Encostou o celular:

1. **Ato 1 — "Seu 2026"**: história em formato stories (momentos, números, 3 palavras, o que o time diz, agradecimento + "contamos com você em 2027").
2. **Ato 2 — "O Universo"**: o planeta da pessoa **acende ao vivo** para todo mundo. Ela toca no planeta de um colega e manda um **cometa**: texto, sticker, foto juntos ou áudio. Cada cometa desenha uma linha entre os dois. No fim, o mapa vira a constelação do time.

Stack: Next.js 16 (Vercel) · Supabase (Postgres + Storage + Realtime) · Claude (moderação + rascunho das histórias).

---

## 🗺️ Mapa do código

| Caminho | O quê |
|---|---|
| `supabase/migrations/0001_init.sql` | Tabelas, RLS, buckets, Realtime |
| `src/app/t/[token]/route.ts` | Entrada do NFC: token → cookie → acende planeta |
| `src/app/eu` + `components/StoryPlayer.tsx` | Ato 1 (stories animados) |
| `src/app/universo` + `components/Universe.tsx` | Ato 2 (mapa ao vivo) |
| `components/Composer.tsx` | Mandar cometa (texto/sticker/foto/áudio/cápsula do tempo) |
| `components/Inbox.tsx` | Recebidos (ocultar/denunciar) e enviados (status) |
| `src/lib/moderation/` | **Guardrail** (blocklist → Claude → gestor) |
| `src/app/admin` | Torre de controle dos gestores (fila, barradas, prévia das histórias) |
| `scripts/draft-stories.mjs` | Formulário → rascunho de história com IA |
| `scripts/import.mjs` | Pessoas + histórias → Supabase, gera `out/tags.csv` |
| `models/planetinha.scad` / `.stl` | Peça 3D com bolso para a tag |

## 🛡️ Guardrail (como ninguém manda putaria)

| Camada | O que faz |
|---|---|
| 0. Design | Prompts guiados, 300 caracteres, stickers curados, 30 cometas/dia, 5 por pessoa/dia |
| 1. Blocklist | `lib/moderation/blocklist.ts` pega o óbvio, inclusive `p0rr4`, `f.d.p` |
| 2. Claude | Texto e foto. Política: **zoeira pode, desrespeito não**. Bloqueou? Sugere uma versão gentil ("Que tal assim?") |
| 3. Áudio | Vai sempre para um gestor (30s cada). Para automatizar, plugue um speech-to-text em `lib/moderation/index.ts` |
| 4. Gestores | `/admin`: aprovar/barrar a fila, revisar o que a IA barrou (falsos positivos) |
| 5. Destinatário | Ocultar ou denunciar (some na hora e volta para a fila) |
| Falha fechada | Erro ou recusa da API = vai para o gestor. **Nunca** publica sem checagem |

Mídia fica num bucket privado: o servidor só gera link para mensagens **aprovadas**. A foto é reduzida no celular, o que também remove o EXIF (localização).

---

## 🚀 Setup (uma vez)

1. **Supabase**: crie o projeto. No SQL Editor, rode `supabase/migrations/0001_init.sql`.
2. **Variáveis**: `cp .env.example .env.local` e preencha. Gere os segredos com `openssl rand -base64 48`.
3. **Rodar local**:
   ```bash
   npm install
   ```
   ```bash
   npm run dev
   ```
4. **Vercel**: importe o repo e cole as mesmas variáveis. Para uso de empresa, o plano Hobby não vale (é não comercial); use o Pro.
5. **Domínio**: defina o `PUBLIC_BASE_URL` **antes** de gravar as tags. Ele vai gravado no plástico, literalmente.

## ✍️ Conteúdo (o pipeline)

```
Google Forms ─► content/form.csv ─► draft-stories (IA) ─► content/stories/<slug>.json
                                                              │  líder revisa ✋
content/people.csv ──────────────────────────────────────────┴─► import ─► Supabase + out/tags.csv
```

1. `cp -r content.example content`. A pasta `content/` é ignorada pelo git, porque tem dado pessoal.
2. `content/people.csv`: uma linha por pessoa (`slug,name,nickname,color,is_moderator`). Gestores: `is_moderator=sim`.
3. **Formulário** (Google Forms): primeira pergunta "Para quem é?", com o slug. Depois, perguntas livres (momento marcante, número curioso, 3 palavras, recado). Exporte como `content/form.csv`.
4. Rascunhos com IA. Ele não inventa fatos e não sobrescreve um JSON já revisado:
   ```bash
   node --env-file=.env.local scripts/draft-stories.mjs
   ```
5. **Líder revisa** cada `content/stories/<slug>.json` e coloca as fotos em `content/photos/`.
6. Importe. Rode antes com `--dry` para testar:
   ```bash
   node --env-file=.env.local scripts/import.mjs
   ```
7. Confira cada história em `/admin` → **Prévia das histórias**.

`out/tags.csv` = URL de cada pessoa. **Trate como senha**: quem tem a URL "é" a pessoa.

## 🖨️ Impressão (uma impressora, 60 pessoas)

- Peça: `models/planetinha.stl`. Tem 62×34 mm, base plana, **não precisa de suporte**. Para mexer no tamanho, use `planetinha.scad` no OpenSCAD.
- **Pausa na camada Z = 1.8 mm** (o OpenSCAD mostra isso no console). Na pausa, cole um adesivo **NTAG213 de 25 mm** no bolso de cada peça e retome.
- Duplique no fatiador: **16 por placa** (cama de 256 mm) ou 9 (cama de 220 mm). São **4 placas para 64 peças** (60 + 4 reservas). Cada placa com uma cor = 4 "galáxias".
- **Sem nome na peça**: impressão anônima em lote. A identidade é gravada depois, na hora de embalar.
- Nada de filamento metálico nem ímã: metal bloqueia o NFC.

## 📲 Gravar as tags (na hora de embalar)

Para cada linha de `out/tags.csv`:

1. Abra o app NFC Tools → Escrever → Adicionar registro → URL → cole a URL → encoste na peça.
2. **Teste encostando um iPhone e um Android.**
3. Coloque a peça num saquinho com um cartão com o nome ("cartão de embarque 🎫").
4. Só **trave** (lock) as tags depois que tudo estiver testado. O lock é irreversível. Opcional: tag destravada pode ser regravada se der errado.

Reservas: se alguém perder a peça, grave a mesma URL em uma das 4 sobressalentes.

## ✅ Dia D: checklist

- [ ] Rodar com 3 pessoas cobaias, um dia antes
- [ ] Gestores entram em `/admin` (tocam o próprio planeta + PIN) e deixam a aba aberta
- [ ] Telão opcional: `/universo` aberto num notebook de alguém = constelação acendendo ao vivo
- [ ] Depois do evento (março/2027): apagar o bucket `uploads` (prometido na tela de consentimento)
