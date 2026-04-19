create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Игрок',
  lang text not null default 'en' check (lang in ('en', 'ua', 'ru')),
  is_muted boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  born_at timestamptz not null default timezone('utc', now()),
  died_at timestamptz,
  last_synced_at timestamptz not null default timezone('utc', now()),
  hunger numeric not null default 100 check (hunger >= 0 and hunger <= 100),
  energy numeric not null default 100 check (energy >= 0 and energy <= 100),
  happiness numeric not null default 100 check (happiness >= 0 and happiness <= 100),
  is_sick boolean not null default false,
  has_hat boolean not null default false,
  coins integer not null default 0 check (coins >= 0),
  environment text not null default 'day' check (environment in ('day', 'sunset', 'night')),
  color text not null default '#df7720',
  ear_type text not null default 'pointed' check (ear_type in ('pointed', 'floppy')),
  snout_length numeric not null default 0.4 check (snout_length >= 0.2 and snout_length <= 0.8),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pets_user_id_idx on public.pets(user_id);
create index if not exists pets_dead_sort_idx on public.pets(died_at desc, born_at asc);
create unique index if not exists pets_one_live_pet_per_user
  on public.pets(user_id)
  where died_at is null;

drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists handle_pets_updated_at on public.pets;
create trigger handle_pets_updated_at
before update on public.pets
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.pets enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own pets" on public.pets;
create policy "Users can read own pets"
  on public.pets
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own pets" on public.pets;
create policy "Users can insert own pets"
  on public.pets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own pets" on public.pets;
create policy "Users can update own pets"
  on public.pets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pets" on public.pets;
create policy "Users can delete own pets"
  on public.pets
  for delete
  using (auth.uid() = user_id);

create or replace function public.get_leaderboard(limit_count integer default 10)
returns table (
  id uuid,
  user_id uuid,
  nickname text,
  born_at timestamptz,
  died_at timestamptz,
  time_lived_ms bigint,
  environment text,
  has_hat boolean,
  color text
)
language sql
security definer
set search_path = public
as $$
  select
    pets.id,
    pets.user_id,
    coalesce(profiles.nickname, 'Игрок') as nickname,
    pets.born_at,
    pets.died_at,
    floor(extract(epoch from (pets.died_at - pets.born_at)) * 1000)::bigint as time_lived_ms,
    pets.environment,
    pets.has_hat,
    pets.color
  from public.pets
  left join public.profiles on profiles.id = pets.user_id
  where pets.died_at is not null
  order by time_lived_ms desc, pets.died_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.get_leaderboard(integer) to anon, authenticated;
