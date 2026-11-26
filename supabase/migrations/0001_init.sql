-- Universo 2026 — schema inicial
-- Regra de ouro: tabelas privadas NÃO têm policy (só o servidor, com service role, acessa).
-- Só `planets` e `comets` são públicas (leitura), para o universo ao vivo via Realtime.

create extension if not exists pgcrypto;

-- Pessoas (PRIVADO) -----------------------------------------------------------
create table public.people (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  nickname      text not null,
  is_moderator  boolean not null default false,
  token_hash    text unique not null,      -- sha256 do token gravado na tag NFC
  story         jsonb not null default '{}'::jsonb,
  consent_at    timestamptz,
  created_at    timestamptz not null default now()
);
alter table public.people enable row level security;

-- Planetas (PÚBLICO, só leitura) --------------------------------------------
create table public.planets (
  id        uuid primary key references public.people(id) on delete cascade,
  nickname  text not null,
  color     text not null,
  x         real not null,                 -- 0..1 posição no mapa
  y         real not null,
  size      real not null default 1,
  lit_at    timestamptz                    -- acende quando a pessoa toca o objeto
);
alter table public.planets enable row level security;
create policy "planets: leitura pública" on public.planets for select using (true);

-- Mensagens / cometas (PRIVADO) ----------------------------------------------
create type public.comet_kind   as enum ('text', 'sticker', 'photo', 'audio');
create type public.comet_status as enum ('pending', 'approved', 'rejected', 'review');

create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  from_id      uuid not null references public.people(id) on delete cascade,
  to_id        uuid not null references public.people(id) on delete cascade,
  kind         public.comet_kind not null,
  body         text,                        -- texto ou legenda
  sticker      text,                        -- id do sticker curado
  media_path   text,                        -- caminho no bucket `uploads`
  status       public.comet_status not null default 'pending',
  moderation   jsonb not null default '{}'::jsonb,
  capsule      boolean not null default false,   -- cápsula do tempo: abre em dez/2027
  hidden       boolean not null default false,   -- destinatário ocultou
  read_at      timestamptz,
  decided_by   uuid references public.people(id),
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  check (from_id <> to_id)
);
create index messages_to_idx on public.messages (to_id, status, created_at desc);
create index messages_from_idx on public.messages (from_id, created_at desc);
create index messages_review_idx on public.messages (status) where status = 'review';
alter table public.messages enable row level security;

-- Denúncias (PRIVADO) --------------------------------------------------------
create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references public.people(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;

-- Cometas (PÚBLICO): só o "rastro" no mapa, nunca o conteúdo ----------------
create table public.comets (
  id          uuid primary key references public.messages(id) on delete cascade,
  from_id     uuid not null references public.planets(id) on delete cascade,
  to_id       uuid not null references public.planets(id) on delete cascade,
  created_at  timestamptz not null default now()
);
alter table public.comets enable row level security;
create policy "comets: leitura pública" on public.comets for select using (true);

-- Realtime: o universo escuta planetas acendendo e cometas cruzando ----------
alter publication supabase_realtime add table public.planets, public.comets;

-- Storage --------------------------------------------------------------------
-- uploads: fotos/áudios das mensagens (privado; servidor só gera link se aprovado)
-- stories: fotos das histórias (privado; servidor gera link assinado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 8388608,
     array['image/jpeg','image/png','image/webp','audio/webm','audio/mp4','audio/mpeg','audio/ogg']),
  ('stories', 'stories', false, 10485760,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
