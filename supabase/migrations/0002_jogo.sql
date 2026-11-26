-- Universo 2026 — modo JOGO (RPG leve, ao vivo no evento)
-- Fases: lobby (perfis) -> playing (visitar planetas) -> capsule (todos verdes: escrever cápsula) -> finale (motions)

create type public.game_phase as enum ('lobby', 'playing', 'capsule', 'finale');

-- Estado do jogo (PÚBLICO, linha única) ---------------------------------------
create table public.game (
  id              int primary key default 1 check (id = 1),
  phase           public.game_phase not null default 'lobby',
  green_at        int not null default 30,   -- energia para ficar verde (calibre com o simulador!)
  sender_cap      int not null default 8,    -- quanto UMA pessoa pode dar para um planeta (evita "melhor amigo enche sozinho")
  started_at      timestamptz,
  all_green_at    timestamptz,
  finale_at       timestamptz,
  stats           jsonb                      -- estatísticas do filme do time (preenchido no final)
);
insert into public.game (id) values (1);
alter table public.game enable row level security;
create policy "game: leitura pública" on public.game for select using (true);

-- Planetas ganham energia (recebida) e XP (doada) ----------------------------
alter table public.planets
  add column energy   int not null default 0,   -- energia recebida (com teto por remetente)
  add column received int not null default 0,   -- total recebido sem teto (Sol do Time)
  add column senders  int not null default 0,   -- pessoas diferentes que mandaram
  add column xp       int not null default 0,   -- XP de quem DOA
  add column visited  int not null default 0;   -- planetas diferentes visitados (Explorador)

-- Perfil: foto + coisas que a própria pessoa adiciona ------------------------
alter table public.people
  add column photo_path text,
  add column finale jsonb;                       -- cache do motion pessoal (frase da IA etc.)

create table public.profile_items (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.people(id) on delete cascade,
  text        text not null check (char_length(text) <= 200),
  emoji       text not null default '✨',
  status      public.comet_status not null default 'pending',
  moderation  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index on public.profile_items (person_id, status);
alter table public.profile_items enable row level security;

-- Interações novas: reação e comentário em itens do perfil -------------------
-- (kind vira text com check: adicionar valor a enum na mesma transação quebra o índice abaixo)
alter table public.messages alter column kind type text using kind::text;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'sticker', 'photo', 'audio', 'reaction', 'comment'));
alter table public.messages
  add column item_ref text,                      -- 'moment:0', 'item:<uuid>', 'photo', ...
  add column points int not null default 0,      -- energia que entrega ao destinatário
  add column xp int not null default 0;          -- XP que rende a quem mandou
-- uma reação por emoji por item por pessoa
create unique index messages_one_reaction on public.messages (from_id, to_id, item_ref, sticker) where kind = 'reaction';

-- Cápsula do tempo (PRIVADO) --------------------------------------------------
create table public.capsules (
  person_id    uuid primary key references public.people(id) on delete cascade,
  para_mim     text not null check (char_length(para_mim) <= 1500),     -- só a pessoa relê em dez/2027
  para_empresa text check (char_length(para_empresa) <= 1500),          -- entra ANÔNIMO na síntese da diretoria
  created_at   timestamptz not null default now()
);
alter table public.capsules enable row level security;

create table public.board_capsule (
  id          int primary key default 1 check (id = 1),
  content     jsonb not null,
  created_at  timestamptz not null default now()
);
alter table public.board_capsule enable row level security;

alter publication supabase_realtime add table public.game;

-- Recalcula energia/XP de um par (quem recebeu e quem mandou) e encerra o jogo se todos ficaram verdes
create or replace function public.recompute(receiver uuid, giver uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.game;
begin
  select * into g from public.game where id = 1;

  update public.planets p set
    energy = coalesce((select sum(least(s, g.sender_cap)) from (
               select sum(points) s from public.messages
               where to_id = receiver and status = 'approved' group by from_id) x), 0),
    received = coalesce((select sum(points) from public.messages where to_id = receiver and status = 'approved'), 0),
    senders = (select count(distinct from_id) from public.messages where to_id = receiver and status = 'approved')
  where p.id = receiver;

  update public.planets p set
    xp = coalesce((select sum(xp) from public.messages where from_id = giver and status = 'approved'), 0),
    visited = (select count(distinct to_id) from public.messages where from_id = giver and status = 'approved')
  where p.id = giver;

  if g.phase = 'playing' and not exists (select 1 from public.planets where energy < g.green_at) then
    update public.game set phase = 'capsule', all_green_at = now() where id = 1;
  end if;
end $$;
revoke all on function public.recompute(uuid, uuid) from public, anon, authenticated;
