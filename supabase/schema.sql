-- Jalankan SQL ini sekali saja di Supabase Dashboard -> SQL Editor (Gratis / Free Tier)
-- Setelah dijalankan, semua fitur MochiDuo akan sinkron real-time antar 2 HP.

create table if not exists public.couple_rooms (
  room_code text primary key,
  couple_title text not null default 'Mochi & Boba',
  anniversary_date text not null default '2024-02-14',
  hug_count integer not null default 0,
  last_hug_from text,
  last_hug_at bigint,
  p1_profile jsonb not null,
  p2_profile jsonb not null,
  p1_location jsonb not null,
  p2_location jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_memories (
  id text primary key,
  room_code text not null references public.couple_rooms(room_code) on delete cascade,
  data jsonb not null,
  created_at bigint not null
);

create table if not exists public.couple_buckets (
  id text primary key,
  room_code text not null references public.couple_rooms(room_code) on delete cascade,
  data jsonb not null,
  updated_at bigint not null
);

create table if not exists public.couple_notes (
  id text primary key,
  room_code text not null references public.couple_rooms(room_code) on delete cascade,
  data jsonb not null,
  created_at bigint not null
);

create index if not exists idx_couple_memories_room on public.couple_memories(room_code, created_at desc);
create index if not exists idx_couple_buckets_room on public.couple_buckets(room_code, updated_at desc);
create index if not exists idx_couple_notes_room on public.couple_notes(room_code, created_at desc);

-- Row Level Security (akses dibatasi per project & room_code rahasia pasangan)
alter table public.couple_rooms enable row level security;
alter table public.couple_memories enable row level security;
alter table public.couple_buckets enable row level security;
alter table public.couple_notes enable row level security;

create policy "Allow couple_rooms access" on public.couple_rooms for all using (true) with check (true);
create policy "Allow couple_memories access" on public.couple_memories for all using (true) with check (true);
create policy "Allow couple_buckets access" on public.couple_buckets for all using (true) with check (true);
create policy "Allow couple_notes access" on public.couple_notes for all using (true) with check (true);

-- Aktifkan Realtime Postgres Changes untuk keempat tabel
alter publication supabase_realtime add table public.couple_rooms;
alter publication supabase_realtime add table public.couple_memories;
alter publication supabase_realtime add table public.couple_buckets;
alter publication supabase_realtime add table public.couple_notes;
