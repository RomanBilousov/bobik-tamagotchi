create or replace function public.bobik_seed_hash(
  p_seed text,
  p_salt text default ''
)
returns bigint
language plpgsql
immutable
set search_path = public
as $$
declare
  normalized text := coalesce(nullif(p_seed, ''), 'bobik-guest') || ':' || coalesce(p_salt, '');
  hash_value bigint := 0;
  idx integer;
begin
  for idx in 1..char_length(normalized) loop
    hash_value := mod(hash_value * 33 + ascii(substr(normalized, idx, 1)), 2147483647);
  end loop;

  return hash_value;
end;
$$;

create or replace function public.generate_bobik_nickname(p_seed text default null)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  adjectives text[] := array[
    'Шустрый',
    'Пиксельный',
    'Озорной',
    'Ловкий',
    'Бодрый',
    'Звёздный',
    'Смелый',
    'Тёплый',
    'Хитрый',
    'Яркий',
    'Пушистый',
    'Дворовый',
    'Славный',
    'Весёлый',
    'Лунный',
    'Сонный'
  ];
  nouns text[] := array[
    'Хвост',
    'Тапок',
    'Носик',
    'Прыгун',
    'Ушастик',
    'Следопыт',
    'Бублик',
    'Трюкач',
    'Шарик',
    'Гавчик',
    'Искатель',
    'Спринтер',
    'Комочек',
    'Барбос',
    'Смайлик',
    'Метеор'
  ];
  adjective text;
  noun text;
  suffix text;
begin
  adjective := adjectives[(public.bobik_seed_hash(p_seed, 'adj') % array_length(adjectives, 1))::integer + 1];
  noun := nouns[(public.bobik_seed_hash(p_seed, 'noun') % array_length(nouns, 1))::integer + 1];
  suffix := lpad(((public.bobik_seed_hash(p_seed, 'suffix') % 90) + 10)::text, 2, '0');

  return left(format('%s %s %s', adjective, noun, suffix), 40);
end;
$$;

create or replace function public.ensure_fun_profile_nickname()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  normalized_nickname text := lower(btrim(coalesce(new.nickname, '')));
begin
  if normalized_nickname = '' or normalized_nickname in ('игрок', 'player', 'guest', 'user') then
    new.nickname := public.generate_bobik_nickname(coalesce(new.id::text, auth.uid()::text));
  else
    new.nickname := left(btrim(new.nickname), 40);
  end if;

  return new;
end;
$$;

drop trigger if exists handle_profiles_fun_nickname on public.profiles;
create trigger handle_profiles_fun_nickname
before insert or update on public.profiles
for each row
execute function public.ensure_fun_profile_nickname();

update public.profiles
set nickname = public.generate_bobik_nickname(id::text)
where nickname is null
   or btrim(nickname) = ''
   or lower(btrim(nickname)) in ('игрок', 'player', 'guest', 'user');

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
  with ranked_runs as (
    select
      pets.id,
      pets.user_id,
      coalesce(nullif(btrim(profiles.nickname), ''), public.generate_bobik_nickname(pets.user_id::text)) as nickname,
      pets.born_at,
      pets.died_at,
      floor(extract(epoch from (pets.died_at - pets.born_at)) * 1000)::bigint as time_lived_ms,
      pets.environment,
      pets.has_hat,
      pets.color,
      row_number() over (
        partition by pets.user_id
        order by (pets.died_at - pets.born_at) desc, pets.died_at desc, pets.born_at asc
      ) as user_rank
    from public.pets
    left join public.profiles on profiles.id = pets.user_id
    where pets.died_at is not null
  )
  select
    ranked_runs.id,
    ranked_runs.user_id,
    ranked_runs.nickname,
    ranked_runs.born_at,
    ranked_runs.died_at,
    ranked_runs.time_lived_ms,
    ranked_runs.environment,
    ranked_runs.has_hat,
    ranked_runs.color
  from ranked_runs
  where ranked_runs.user_rank = 1
  order by ranked_runs.time_lived_ms desc, ranked_runs.died_at desc
  limit greatest(limit_count, 1);
$$;

grant execute on function public.bobik_seed_hash(text, text) to anon, authenticated;
grant execute on function public.generate_bobik_nickname(text) to anon, authenticated;
grant execute on function public.get_leaderboard(integer) to anon, authenticated;
