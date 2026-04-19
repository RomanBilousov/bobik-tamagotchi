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
      'hasPassword', profile_row.has_password
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

  return jsonb_build_object(
    'sinceAt', since_at,
    'untilAt', timezone('utc', now()),
    'totals', jsonb_build_object(
      'newPlayers', (select count(*) from public.profiles where first_seen_at >= since_at),
      'returningSessions', (
        select count(*)
        from public.player_events
        where event_type = 'telegram_session'
          and created_at >= since_at
      ),
      'securedAccounts', (
        select count(distinct user_id)
        from public.player_events
        where event_type in ('account_secured', 'account_password_changed')
          and created_at >= since_at
      ),
      'petsAdopted', (
        select count(*)
        from public.player_events
        where event_type = 'pet_adopted'
          and created_at >= since_at
      ),
      'treasuresFound', (
        select count(*)
        from public.player_events
        where event_type = 'treasure_found'
          and created_at >= since_at
      ),
      'hatPurchases', (
        select count(*)
        from public.player_events
        where event_type = 'hat_purchased'
          and created_at >= since_at
      ),
      'hatEquips', (
        select count(*)
        from public.player_events
        where event_type = 'hat_equipped'
          and created_at >= since_at
      ),
      'petDeaths', (
        select count(*)
        from public.player_events
        where event_type = 'pet_died'
          and created_at >= since_at
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
        from public.profiles
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
        join public.profiles profiles on profiles.id = events.user_id
        where events.created_at >= since_at
        group by events.user_id, profiles.nickname, profiles.telegram_username
        order by event_count desc, profiles.nickname asc
        limit 5
      ) q
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_admin_player_detail(text, uuid) to anon;
grant execute on function public.get_admin_daily_summary(text) to anon;
