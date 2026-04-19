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
      coalesce(profiles.nickname, 'Игрок') as nickname,
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

grant execute on function public.get_leaderboard(integer) to anon, authenticated;
