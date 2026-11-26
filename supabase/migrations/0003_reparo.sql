-- Reparo idempotente da 0002: pode rodar quantas vezes quiser. Só cria o que estiver faltando.
do $$ begin create type public.game_phase as enum ('lobby','playing','capsule','finale'); exception when duplicate_object then null; end $$;

create table if not exists public.game (
  id int primary key default 1 check (id = 1),
  phase public.game_phase not null default 'lobby',
  green_at int not null default 30,
  sender_cap int not null default 8,
  started_at timestamptz, all_green_at timestamptz, finale_at timestamptz,
  stats jsonb
);
insert into public.game (id) values (1) on conflict (id) do nothing;
alter table public.game enable row level security;
do $$ begin create policy "game: leitura pública" on public.game for select using (true); exception when duplicate_object then null; end $$;

alter table public.planets
  add column if not exists energy int not null default 0,
  add column if not exists received int not null default 0,
  add column if not exists senders int not null default 0,
  add column if not exists xp int not null default 0,
  add column if not exists visited int not null default 0;

alter table public.people
  add column if not exists photo_path text,
  add column if not exists finale jsonb;

create table if not exists public.profile_items (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  text text not null check (char_length(text) <= 200),
  emoji text not null default '✨',
  status public.comet_status not null default 'pending',
  moderation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists profile_items_person_idx on public.profile_items (person_id, status);
alter table public.profile_items enable row level security;

do $$ begin
  if (select data_type from information_schema.columns where table_schema='public' and table_name='messages' and column_name='kind') <> 'text' then
    alter table public.messages alter column kind type text using kind::text;
  end if;
end $$;
do $$ begin
  alter table public.messages add constraint messages_kind_check check (kind in ('text','sticker','photo','audio','reaction','comment'));
exception when duplicate_object then null; end $$;
alter table public.messages
  add column if not exists item_ref text,
  add column if not exists points int not null default 0,
  add column if not exists xp int not null default 0;
create unique index if not exists messages_one_reaction on public.messages (from_id, to_id, item_ref, sticker) where kind = 'reaction';

create table if not exists public.capsules (
  person_id uuid primary key references public.people(id) on delete cascade,
  para_mim text not null check (char_length(para_mim) <= 1500),
  para_empresa text check (char_length(para_empresa) <= 1500),
  created_at timestamptz not null default now()
);
alter table public.capsules enable row level security;

create table if not exists public.board_capsule (
  id int primary key default 1 check (id = 1),
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.board_capsule enable row level security;

do $$ begin alter publication supabase_realtime add table public.game; exception when duplicate_object then null; end $$;

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

-- Diagnóstico: deve mostrar 1 linha com phase = lobby
select 'game OK' as status, phase, green_at, sender_cap from public.game;
