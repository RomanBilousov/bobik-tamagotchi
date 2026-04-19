create or replace function public.is_admin_test_profile(p_user_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles profiles
    left join public.account_credentials credentials on credentials.user_id = profiles.id
    where profiles.id = p_user_id
      and (
        lower(coalesce(profiles.nickname, '')) = 'smoke test'
        or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
        or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
      )
  );
$$;

with test_users as (
  select profiles.id
  from public.profiles profiles
  left join public.account_credentials credentials on credentials.user_id = profiles.id
  where
    lower(coalesce(profiles.nickname, '')) = 'smoke test'
    or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
    or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
)
delete from public.player_events
where user_id in (select id from test_users);

with test_users as (
  select profiles.id
  from public.profiles profiles
  left join public.account_credentials credentials on credentials.user_id = profiles.id
  where
    lower(coalesce(profiles.nickname, '')) = 'smoke test'
    or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
    or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
)
delete from public.pets
where user_id in (select id from test_users);

with test_users as (
  select profiles.id
  from public.profiles profiles
  left join public.account_credentials credentials on credentials.user_id = profiles.id
  where
    lower(coalesce(profiles.nickname, '')) = 'smoke test'
    or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
    or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
)
delete from public.account_credentials
where user_id in (select id from test_users);

with test_users as (
  select profiles.id
  from public.profiles profiles
  left join public.account_credentials credentials on credentials.user_id = profiles.id
  where
    lower(coalesce(profiles.nickname, '')) = 'smoke test'
    or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
    or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
)
delete from public.profiles
where id in (select id from test_users);

create or replace function public.get_admin_dashboard(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_valid_admin_secret(p_secret) then
    raise exception 'Invalid admin secret';
  end if;

  with filtered_profiles as (
    select profiles.*
    from public.profiles profiles
    where not public.is_admin_test_profile(profiles.id)
  ),
  real_players as (
    select profiles.*
    from filtered_profiles profiles
    where profiles.telegram_user_id is not null
      or exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = profiles.id
      )
  ),
  guest_profiles as (
    select profiles.*
    from filtered_profiles profiles
    where profiles.telegram_user_id is null
      and not exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = profiles.id
      )
  ),
  recent_players_rows as (
    select
      profiles.id,
      profiles.nickname,
      profiles.telegram_username,
      profiles.telegram_user_id,
      profiles.first_seen_at,
      profiles.last_seen_at,
      exists(select 1 from public.account_credentials creds where creds.user_id = profiles.id) as has_password,
      (
        select pets.coins
        from public.pets pets
        where pets.user_id = profiles.id
          and pets.died_at is null
        limit 1
      ) as live_coins,
      (
        select max(floor(extract(epoch from (pets.died_at - pets.born_at)) * 1000)::bigint)
        from public.pets pets
        where pets.user_id = profiles.id
          and pets.died_at is not null
      ) as best_run_ms
    from filtered_profiles profiles
    order by
      (profiles.telegram_user_id is not null
        or exists(select 1 from public.account_credentials creds where creds.user_id = profiles.id)) desc,
      profiles.last_seen_at desc nulls last
    limit 10
  ),
  recent_events_rows as (
    select
      events.id,
      events.event_type,
      events.source,
      events.created_at,
      events.payload,
      profiles.nickname,
      profiles.telegram_username,
      profiles.telegram_user_id
    from public.player_events events
    join filtered_profiles profiles on profiles.id = events.user_id
    order by events.created_at desc
    limit 15
  )
  select jsonb_build_object(
    'totals',
    jsonb_build_object(
      'playersTotal', (select count(*) from real_players),
      'guestProfiles', (select count(*) from guest_profiles),
      'profilesTotal', (select count(*) from filtered_profiles),
      'telegramPlayers', (select count(*) from real_players where telegram_user_id is not null),
      'active24h', (select count(*) from real_players where last_seen_at >= timezone('utc', now()) - interval '24 hours'),
      'active7d', (select count(*) from real_players where last_seen_at >= timezone('utc', now()) - interval '7 days'),
      'securedAccounts', (
        select count(*)
        from public.account_credentials credentials
        join filtered_profiles profiles on profiles.id = credentials.user_id
      ),
      'livePets', (
        select count(*)
        from public.pets pets
        join real_players profiles on profiles.id = pets.user_id
        where pets.died_at is null
      ),
      'deadPets', (
        select count(*)
        from public.pets pets
        join real_players profiles on profiles.id = pets.user_id
        where pets.died_at is not null
      ),
      'eventCount', (
        select count(*)
        from public.player_events events
        join real_players profiles on profiles.id = events.user_id
      )
    ),
    'recentPlayers',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', q.id,
          'nickname', q.nickname,
          'telegramUsername', q.telegram_username,
          'telegramUserId', q.telegram_user_id,
          'firstSeenAt', q.first_seen_at,
          'lastSeenAt', q.last_seen_at,
          'hasPassword', q.has_password,
          'liveCoins', q.live_coins,
          'bestRunMs', q.best_run_ms
        )
      )
      from recent_players_rows q
    ), '[]'::jsonb),
    'recentEvents',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'eventId', q.id,
          'eventType', q.event_type,
          'source', q.source,
          'createdAt', q.created_at,
          'nickname', q.nickname,
          'telegramUsername', q.telegram_username,
          'telegramUserId', q.telegram_user_id,
          'payload', q.payload
        )
      )
      from recent_events_rows q
    ), '[]'::jsonb),
    'leaderboard',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', lb.user_id,
          'nickname', lb.nickname,
          'timeLivedMs', lb.time_lived_ms,
          'environment', lb.environment,
          'hasHat', lb.has_hat,
          'color', lb.color
        )
      )
      from public.get_leaderboard(5) lb
      where not public.is_admin_test_profile(lb.user_id)
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

grant execute on function public.is_admin_test_profile(uuid) to anon;
grant execute on function public.get_admin_dashboard(text) to anon;
