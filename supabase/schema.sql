-- Run this in the Supabase project's SQL Editor (Project: hero-story).
-- Backs the cloud backup/restore feature in app/game/account.ts. RLS is the
-- actual security boundary here - the anon key used by the client can only
-- ever see/touch rows where user_id = auth.uid().
--
-- Each account has at most two backups: one 'auto' (from clearing a world)
-- and one 'manual' (지금 백업), each overwritten in place by upsert - not
-- one row per local save slot. If an earlier version of this schema (keyed
-- on (user_id, slot_id)) is already applied, drop it first:
--   drop table if exists public.saves;

create table if not exists public.saves (
  user_id uuid references auth.users(id) on delete cascade not null,
  backup_type text not null check (backup_type in ('auto', 'manual')),
  slot_id text not null,
  save_data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, backup_type)
);

alter table public.saves enable row level security;

create policy "Users can manage their own saves"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
