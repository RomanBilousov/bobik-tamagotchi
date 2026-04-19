alter table public.profiles
  add column if not exists admin_tag text;

update public.profiles profiles
set admin_tag = 'test-profile'
where coalesce(profiles.admin_tag, '') = ''
  and profiles.telegram_user_id is null
  and not exists (
    select 1
    from public.account_credentials credentials
    where credentials.user_id = profiles.id
  );

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
        profiles.admin_tag = 'test-profile'
        or lower(coalesce(profiles.nickname, '')) = 'smoke test'
        or lower(coalesce(profiles.telegram_username, '')) = 'track_probe'
        or lower(coalesce(credentials.login_name, '')) like 'smoke-%'
        or lower(coalesce(profiles.nickname, '')) like 'qa %'
        or lower(coalesce(credentials.login_name, '')) like 'qa-%'
      )
  );
$$;

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

  with all_profiles as (
    select profiles.*
    from public.profiles profiles
  ),
  test_profiles as (
    select profiles.*
    from all_profiles profiles
    where public.is_admin_test_profile(profiles.id)
  ),
  non_test_profiles as (
    select profiles.*
    from all_profiles profiles
    where not public.is_admin_test_profile(profiles.id)
  ),
  real_players as (
    select profiles.*
    from non_test_profiles profiles
    where profiles.telegram_user_id is not null
      or exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = profiles.id
      )
  ),
  guest_profiles as (
    select profiles.*
    from non_test_profiles profiles
    where profiles.telegram_user_id is null
      and not exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = profiles.id
      )
  ),
  display_players as (
    select
      profiles.id,
      profiles.nickname,
      profiles.telegram_username,
      profiles.telegram_user_id,
      profiles.first_seen_at,
      profiles.last_seen_at,
      profiles.admin_tag,
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
      ) as best_run_ms,
      case when profiles.admin_tag = 'test-profile' then 1 else 0 end as tag_priority,
      case
        when profiles.telegram_user_id is not null
          or exists(select 1 from public.account_credentials creds where creds.user_id = profiles.id)
        then 0
        else 1
      end as player_priority
    from all_profiles profiles
    where
      (
        profiles.telegram_user_id is not null
        or exists(select 1 from public.account_credentials creds where creds.user_id = profiles.id)
      )
      or profiles.admin_tag = 'test-profile'
  ),
  recent_players_rows as (
    select *
    from display_players
    order by player_priority asc, tag_priority asc, last_seen_at desc nulls last
    limit 12
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
    join real_players profiles on profiles.id = events.user_id
    order by events.created_at desc
    limit 15
  )
  select jsonb_build_object(
    'totals',
    jsonb_build_object(
      'playersTotal', (select count(*) from real_players),
      'guestProfiles', (select count(*) from guest_profiles),
      'testProfiles', (select count(*) from test_profiles),
      'profilesTotal', (select count(*) from all_profiles),
      'telegramPlayers', (select count(*) from real_players where telegram_user_id is not null),
      'active24h', (select count(*) from real_players where last_seen_at >= timezone('utc', now()) - interval '24 hours'),
      'active7d', (select count(*) from real_players where last_seen_at >= timezone('utc', now()) - interval '7 days'),
      'securedAccounts', (
        select count(*)
        from public.account_credentials credentials
        join real_players profiles on profiles.id = credentials.user_id
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
          'bestRunMs', q.best_run_ms,
          'adminTag', q.admin_tag
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

create or replace function public.get_admin_player_detail(
  p_secret text,
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row record;
  live_pet_row record;
  totals_row record;
  best_run_ms bigint;
begin
  if not public.is_valid_admin_secret(p_secret) then
    raise exception 'Invalid admin secret';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  select
    profiles.id,
    profiles.nickname,
    profiles.lang,
    profiles.is_muted,
    profiles.telegram_user_id,
    profiles.telegram_username,
    profiles.telegram_first_name,
    profiles.telegram_last_name,
    profiles.telegram_language_code,
    profiles.telegram_is_premium,
    profiles.first_seen_at,
    profiles.last_seen_at,
    profiles.last_event_at,
    profiles.admin_tag,
    exists(select 1 from public.account_credentials creds where creds.user_id = profiles.id) as has_password
  into profile_row
  from public.profiles
  where profiles.id = p_user_id;

  if profile_row.id is null then
    raise exception 'Player not found';
  end if;

  select
    pets.id,
    pets.coins,
    pets.hunger,
    pets.energy,
    pets.happiness,
    pets.is_sick,
    pets.environment,
    pets.color,
    pets.owned_hats,
    pets.active_hat,
    pets.born_at,
    pets.treasure_ready_at
  into live_pet_row
  from public.pets pets
  where pets.user_id = p_user_id
    and pets.died_at is null
  limit 1;

  select
    count(*) as total_pets,
    count(*) filter (where pets.died_at is null) as live_pets,
    count(*) filter (where pets.died_at is not null) as dead_pets
  into totals_row
  from public.pets pets
  where pets.user_id = p_user_id;

  select max(floor(extract(epoch from (pets.died_at - pets.born_at)) * 1000)::bigint)
  into best_run_ms
  from public.pets pets
  where pets.user_id = p_user_id
    and pets.died_at is not null;

  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', profile_row.id,
      'nickname', profile_row.nickname,
      'lang', profile_row.lang,
      'isMuted', profile_row.is_muted,
      'telegramUserId', profile_row.telegram_user_id,
      'telegramUsername', profile_row.telegram_username,
      'telegramFirstName', profile_row.telegram_first_name,
      'telegramLastName', profile_row.telegram_last_name,
      'telegramLanguageCode', profile_row.telegram_language_code,
      'telegramIsPremium', profile_row.telegram_is_premium,
      'firstSeenAt', profile_row.first_seen_at,
      'lastSeenAt', profile_row.last_seen_at,
      'lastEventAt', profile_row.last_event_at,
      'hasPassword', profile_row.has_password,
      'adminTag', profile_row.admin_tag
    ),
    'pet', case
      when live_pet_row.id is null then null
      else jsonb_build_object(
        'id', live_pet_row.id,
        'coins', live_pet_row.coins,
        'hunger', live_pet_row.hunger,
        'energy', live_pet_row.energy,
        'happiness', live_pet_row.happiness,
        'isSick', live_pet_row.is_sick,
        'environment', live_pet_row.environment,
        'color', live_pet_row.color,
        'ownedHats', live_pet_row.owned_hats,
        'activeHat', live_pet_row.active_hat,
        'bornAt', live_pet_row.born_at,
        'treasureReadyAt', live_pet_row.treasure_ready_at
      )
    end,
    'totals', jsonb_build_object(
      'totalPets', coalesce(totals_row.total_pets, 0),
      'livePets', coalesce(totals_row.live_pets, 0),
      'deadPets', coalesce(totals_row.dead_pets, 0),
      'bestRunMs', best_run_ms
    ),
    'recentEvents', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'eventType', q.event_type,
          'source', q.source,
          'createdAt', q.created_at,
          'payload', q.payload
        )
      )
      from (
        select events.id, events.event_type, events.source, events.created_at, events.payload
        from public.player_events events
        where events.user_id = p_user_id
        order by events.created_at desc
        limit 12
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_admin_daily_summary(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  since_at timestamptz := timezone('utc', now()) - interval '24 hours';
begin
  if not public.is_valid_admin_secret(p_secret) then
    raise exception 'Invalid admin secret';
  end if;

  return (
    with all_profiles as (
      select profiles.*
      from public.profiles profiles
    ),
    test_profiles as (
      select profiles.*
      from all_profiles profiles
      where public.is_admin_test_profile(profiles.id)
    ),
    non_test_profiles as (
      select profiles.*
      from all_profiles profiles
      where not public.is_admin_test_profile(profiles.id)
    ),
    real_players as (
      select profiles.*
      from non_test_profiles profiles
      where profiles.telegram_user_id is not null
         or exists(
           select 1
           from public.account_credentials credentials
           where credentials.user_id = profiles.id
         )
    ),
    guest_profiles as (
      select profiles.*
      from non_test_profiles profiles
      where profiles.telegram_user_id is null
        and not exists(
          select 1
          from public.account_credentials credentials
          where credentials.user_id = profiles.id
        )
    )
    select jsonb_build_object(
      'sinceAt', since_at,
      'untilAt', timezone('utc', now()),
      'totals', jsonb_build_object(
        'newPlayers', (select count(*) from real_players where first_seen_at >= since_at),
        'newGuestProfiles', (select count(*) from guest_profiles where first_seen_at >= since_at),
        'newTestProfiles', (select count(*) from test_profiles where first_seen_at >= since_at),
        'returningSessions', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'telegram_session'
            and events.created_at >= since_at
        ),
        'securedAccounts', (
          select count(distinct events.user_id)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type in ('account_secured', 'account_password_changed')
            and events.created_at >= since_at
        ),
        'petsAdopted', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'pet_adopted'
            and events.created_at >= since_at
        ),
        'treasuresFound', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'treasure_found'
            and events.created_at >= since_at
        ),
        'premiumFoodBought', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'premium_food_bought'
            and events.created_at >= since_at
        ),
        'medicineBought', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'medicine_bought'
            and events.created_at >= since_at
        ),
        'hatPurchases', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'hat_purchased'
            and events.created_at >= since_at
        ),
        'hatEquips', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'hat_equipped'
            and events.created_at >= since_at
        ),
        'petDeaths', (
          select count(*)
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.event_type = 'pet_died'
            and events.created_at >= since_at
        )
      ),
      'newPlayers', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'userId', q.id,
            'nickname', q.nickname,
            'telegramUsername', q.telegram_username,
            'telegramUserId', q.telegram_user_id,
            'firstSeenAt', q.first_seen_at
          )
        )
        from (
          select profiles.id, profiles.nickname, profiles.telegram_username, profiles.telegram_user_id, profiles.first_seen_at
          from real_players profiles
          where profiles.first_seen_at >= since_at
          order by profiles.first_seen_at desc
          limit 5
        ) q
      ), '[]'::jsonb),
      'topEventPlayers', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'userId', q.user_id,
            'nickname', q.nickname,
            'telegramUsername', q.telegram_username,
            'eventCount', q.event_count
          )
        )
        from (
          select
            events.user_id,
            profiles.nickname,
            profiles.telegram_username,
            count(*) as event_count
          from public.player_events events
          join real_players profiles on profiles.id = events.user_id
          where events.created_at >= since_at
          group by events.user_id, profiles.nickname, profiles.telegram_username
          order by event_count desc, profiles.nickname asc
          limit 5
        ) q
      ), '[]'::jsonb)
    )
  );
end;
$$;

grant execute on function public.is_admin_test_profile(uuid) to anon;
grant execute on function public.get_admin_dashboard(text) to anon;
grant execute on function public.get_admin_player_detail(text, uuid) to anon;
grant execute on function public.get_admin_daily_summary(text) to anon;
