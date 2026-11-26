# 🪐 Universo 2026

Cada pessoa do time ganha um **planetinha impresso em 3D com NFC**, e o evento vira um **jogo ao vivo**:

```
🪐 TOCA O PLANETA ─► Seu perfil: foto, momentos, números, 3 palavras + você adiciona o que não mapeamos
🚀 LARGADA (gestor) ─► Todo mundo visita os planetas dos outros: reage, comenta, manda cometa
🎨 ENERGIA ─────────► Cada planeta vai do azul-nebulosa ao VERDE conforme recebe carinho
💚 TODOS VERDES ────► Fim do jogo: cada um lacra sua cápsula do tempo
🎬 REVELAÇÃO ───────► Filme pessoal (elogios + prêmios) · Filme do time (telão) · Cápsula da Diretoria (IA, anônima)
```

**Ninguém fica "apagado":** não existe cinza nem vermelho, e o mapa nunca mostra quem tem menos. As missões misturam quem precisa de energia com planetas sorteados. Só os gestores veem, em privado, a lista "precisando de carinho".

**Prêmios:** 🧭 *Explorador(a) Intergaláctico(a)* (visitou mais planetas) · ☀️ *Sol do Time* (recebeu mais carinho) · top 3 de XP. Cada pessoa ainda ganha uma "classe" no filme pessoal (Cronista Estelar, Coração Acelerado…).

**Energia:** reação 1 · sticker 2 · comentário 3 · mensagem 4 · foto 5. Uma pessoa só dá até `sender_cap` de energia para o mesmo planeta. A régua de verde (`green_at`) **se ajusta ao vivo** no `/admin`. Quem doa ganha XP, em dobro quando o planeta ainda não está verde.

## 🗺️ Mapa do código

| Caminho | O quê |
|---|---|
| `supabase/migrations/0001_init.sql`, `0002_jogo.sql` | Tabelas, RLS, buckets; fases do jogo, energia e cápsulas |
| `src/app/t/[token]/route.ts` | Entrada do NFC: token → cookie → acende planeta |
| `src/app/eu` + `components/ProfileView.tsx` | Meu planeta (perfil + adicionar conquistas) |
| `src/app/planeta/[id]` | Visitar o planeta de alguém (reagir, comentar, mandar cometa) |
| `src/app/universo` + `components/Universe.tsx` | Mapa do jogo: energia, progresso, missões, XP, fases |
| `src/app/api/universe` | Retrato do jogo para o polling (cache de 2s na CDN) |
| `src/app/final` + `final/time` | Filme pessoal e filme do time (`MotionPlayer`) |
| `src/app/admin/capsula` | Cápsula da Diretoria (síntese anônima por IA) |
| `src/lib/finale.ts` | Estatísticas, destaques anônimos, prêmios e cápsula da diretoria |
| `scripts/simulate.mjs` | 🤖 Simulador: 59 robôs jogando de verdade |
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
| 3. Reações | Só emojis da lista, sem texto: entram direto, uma por emoji por item |
| 4. Gestores | `/admin`: aprovar/barrar a fila, revisar o que a IA barrou (falsos positivos) |
| 5. Destinatário | Ocultar ou denunciar (some na hora e volta para a fila) |
| Falha fechada | Erro ou recusa da API = vai para o gestor. **Nunca** publica sem checagem |

Mídia fica num bucket privado: o servidor só gera link para mensagens **aprovadas**. A foto é reduzida no celular, o que também remove o EXIF (localização).

---

## 🚀 Setup (uma vez)

1. **Supabase**: crie o projeto. No SQL Editor, rode `0001_init.sql` e depois `0002_jogo.sql` (pasta `supabase/migrations/`).
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
2. `content/people.csv`: uma linha por pessoa (`slug,name,nickname,color,is_moderator,photo`). Gestores: `is_moderator=sim`. `photo` é a fotinho do perfil, que fica em `content/photos/`.
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

## 🤖 Ensaio sozinho: o simulador

Use um **segundo projeto Supabase só para teste** (é grátis), com as migrações rodadas.

```bash
node --env-file=.env.local scripts/simulate.mjs setup
```
Cria você (gestor) + 59 robôs com perfis falsos e imprime **o seu link**. Abra no celular.

```bash
node --env-file=.env.local scripts/simulate.mjs play --url http://localhost:3000
```
Os robôs entram (o lobby enche ao vivo). Você dá a 🚀 largada no `/admin` e assiste o universo ficar verde, jogando junto. Quando todos ficam verdes, eles escrevem as cápsulas e você clica em 🎬 **Grande revelação**.

- `--speed 2` acelera, `--speed 0.5` desacelera (o padrão é ~1 ação a cada 12s por robô, ritmo de gente).
- `--so-reacoes` faz o ensaio sem chamar a IA (custo zero).
- `--malcriados` faz 5% das mensagens serem ofensivas, para ver o guardrail barrando.
- `--url https://seu-preview.vercel.app` roda contra a Vercel de verdade (teste de carga real).
- O terminal mostra a cada 5s: verdes, aprovadas, em revisão, barradas, erros e latência p50/p95.

Para limpar e repetir:
```bash
node --env-file=.env.local scripts/simulate.mjs reset
```

**Calibre a régua com o simulador.** Com 60 pessoas, `green_at=30` deve dar um jogo de ~20–30 min. Se terminar rápido demais, aumente no `/admin`.

## 📈 Aguenta 60 pessoas no plano grátis do Supabase?

Aguenta, porque o app foi desenhado para isso:
- **Sem Realtime no jogo.** Os celulares consultam `/api/universe` a cada 3s, e a CDN da Vercel guarda a resposta por 2s. Assim, 60 pessoas viram ~0,5 consulta por segundo no banco.
- **Uploads vão direto do celular para o Storage**, e as fotos já são reduzidas no aparelho.
- Pico estimado: ~5–10 escritas por segundo. Isso é pouco para o Postgres do plano grátis.

⚠️ **O risco real do plano grátis é outro: o projeto PAUSA depois de 7 dias sem uso.** Use o app (ou rode o simulador) na semana do evento, ou assine o Pro só no mês de dezembro (US$ 25). A Vercel Hobby não vale para uso de empresa; use o Pro.

## ✅ Dia D: checklist

- [ ] Simulador rodado contra a URL de produção (com `--so-reacoes`), um dia antes. Depois `reset`
- [ ] Projeto Supabase acordado (abrir o app no dia anterior)
- [ ] Gestores entram em `/admin` (tocam o próprio planeta + PIN) e deixam a aba aberta
- [ ] **Telão**: `/universo` aberto no notebook de um gestor (o mapa ficando verde ao vivo). No final, `/final/time`
- [ ] Roteiro: entrega dos planetinhas → 5 min de lobby (perfis) → 🚀 largada → todos verdes → cápsulas → 🎬 revelação
- [ ] Depois do evento (março/2027): apagar o bucket `uploads` (prometido na tela de consentimento)
