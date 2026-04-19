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
      'premiumFoodBought', (
        select count(*)
        from public.player_events
        where event_type = 'premium_food_bought'
          and created_at >= since_at
      ),
      'medicineBought', (
        select count(*)
        from public.player_events
        where event_type = 'medicine_bought'
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

grant execute on function public.get_admin_daily_summary(text) to anon;
