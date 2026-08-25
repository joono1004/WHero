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

drop policy if exists "Users can manage their own saves" on public.saves;
create policy "Users can manage their own saves"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -------------------------------------------------------------------------
-- Administrator-managed hero catalogue
-- -------------------------------------------------------------------------
-- The admin role is granted inside the database, never in browser code.  A
-- user changing a URL or JavaScript value therefore cannot gain write access.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    coalesce(new.email, ''),
    case when lower(coalesce(new.email, '')) = 'ljhs1004@gmail.com' then 'admin' else 'player' end
  )
  on conflict (id) do update
    set email = excluded.email,
        role = case when lower(excluded.email) = 'ljhs1004@gmail.com' then 'admin' else public.profiles.role end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
drop trigger if exists on_auth_user_profile_changed on auth.users;
create trigger on_auth_user_profile_changed
  after insert or update of email on auth.users
  for each row execute procedure public.handle_new_profile();

-- Backfill accounts created before this schema was installed.
insert into public.profiles (id, email, role)
select id, coalesce(email, ''), case when lower(coalesce(email, '')) = 'ljhs1004@gmail.com' then 'admin' else 'player' end
from auth.users
on conflict (id) do update
  set email = excluded.email,
      role = case when lower(excluded.email) = 'ljhs1004@gmail.com' then 'admin' else public.profiles.role end;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (id = auth.uid());

create table if not exists public.hero_catalog (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 40),
  availability text not null default 'hidden' check (availability in ('starter', 'recruitable', 'hidden')),
  portrait_path text,
  definition jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.hero_catalog enable row level security;

drop policy if exists "Players can read visible heroes" on public.hero_catalog;
create policy "Players can read visible heroes"
  on public.hero_catalog for select
  using (availability <> 'hidden' or public.is_admin());

drop policy if exists "Administrators can add heroes" on public.hero_catalog;
create policy "Administrators can add heroes"
  on public.hero_catalog for insert
  with check (public.is_admin());

drop policy if exists "Administrators can update heroes" on public.hero_catalog;
create policy "Administrators can update heroes"
  on public.hero_catalog for update
  using (public.is_admin())
  with check (public.is_admin());

-- The first six definitions are seeded only when the catalogue is empty.
-- Later edits in /admin are never overwritten by re-running this file.
insert into public.hero_catalog (id, name, availability, portrait_path, definition) values
('zhang-bao', '장포', 'starter', '/art/heroes/zhang-bao-council-portrait-v1.png',
 '{"id":"zhang-bao","name":"장포","description":"장비의 아들로 태어나 아버지를 닮아 용맹함이 남달랐던 촉한의 맹장. 관우의 원수를 갚기 위한 오나라 원정에 앞장선 무력형 영웅.","attributes":{"leadership":"B","force":"S","intelligence":"C","charisma":"C","vitality":"A"},"unitType":"cavalry","domesticSpecialties":{"troops":"B","gold":"없음","food":"없음","iron":"없음","recovery":"없음","defense":"없음"},"traits":["talent"],"skills":["charge"],"evolution":null}'::jsonb),
('wei-yan', '위연', 'starter', '/art/heroes/wei-yan-council-portrait-v1.png',
 '{"id":"wei-yan","name":"위연","description":"뛰어난 지휘 재능을 지녔으나 반골이라는 평가로 끝내 신뢰받지 못한 비운의 장수. 자오곡 기습안을 건의한 장군형 영웅.","attributes":{"leadership":"S","force":"B","intelligence":"C","charisma":"C","vitality":"B"},"unitType":"infantry","domesticSpecialties":{"troops":"A","gold":"없음","food":"없음","iron":"없음","recovery":"없음","defense":"없음"},"traits":["talent"],"skills":[],"evolution":null}'::jsonb),
('xu-shu', '서서', 'starter', '/art/heroes/xu-shu-council-portrait-v1.png',
 '{"id":"xu-shu","name":"서서","description":"유비를 섬기다 어머니가 인질로 잡혀 조조 진영으로 떠난 비운의 책사. 재능을 다 펼치지 못했다는 지략형 영웅.","attributes":{"leadership":"C","force":"C","intelligence":"S","charisma":"B","vitality":"C"},"unitType":"archer","domesticSpecialties":{"troops":"없음","gold":"B","food":"B","iron":"없음","recovery":"없음","defense":"없음"},"traits":["trade","farming"],"skills":[],"evolution":null}'::jsonb),
('guan-yu', '관우', 'recruitable', null,
 '{"id":"guan-yu","name":"관우","description":"형주를 지키며 수군을 운용한 촉한의 명장. 통솔력과 무력을 겸비한 장군형 영웅.","attributes":{"leadership":"S","force":"A","intelligence":"B","charisma":"A","vitality":"S"},"unitType":"cavalry","domesticSpecialties":{"troops":"A","food":"B","gold":"없음","iron":"없음","recovery":"없음","defense":"B"},"traits":["talent","farming"],"skills":["ironwall"],"evolution":{"targetUnitType":"cavalry_ironclad","requiredLevel":5,"requiredItemId":"evolution-item-cavalry-ironclad"}}'::jsonb),
('zhao-yun', '조운', 'recruitable', null,
 '{"id":"zhao-yun","name":"조운","description":"장판파에서 단신으로 적진을 돌파한 촉한의 맹장. 압도적인 무력을 지닌 무력형 영웅.","attributes":{"leadership":"B","force":"S","intelligence":"B","charisma":"A","vitality":"A"},"unitType":"cavalry","domesticSpecialties":{"troops":"B","food":"C","gold":"없음","iron":"없음","recovery":"B","defense":"없음"},"traits":["talent","farming"],"skills":[],"evolution":null}'::jsonb),
('zhuge-liang', '제갈량', 'recruitable', null,
 '{"id":"zhuge-liang","name":"제갈량","description":"오장원과 기산에서 지략을 펼친 촉한의 승상. 내정과 계략에 능한 지략형 영웅.","attributes":{"leadership":"B","force":"C","intelligence":"SS","charisma":"A","vitality":"B"},"unitType":"strategist","domesticSpecialties":{"troops":"B","food":"S","gold":"A","iron":"B","recovery":"없음","defense":"없음"},"traits":["farming","trade","talent"],"skills":[],"evolution":null}'::jsonb)
on conflict (id) do nothing;
