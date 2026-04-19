alter table public.profiles
  add column if not exists telegram_user_id bigint,
  add column if not exists telegram_username text,
  add column if not exists telegram_first_name text,
  add column if not exists telegram_last_name text,
  add column if not exists telegram_language_code text,
  add column if not exists telegram_photo_url text,
  add column if not exists telegram_is_premium boolean not null default false,
  add column if not exists telegram_start_param text,
  add column if not exists first_seen_at timestamptz not null default timezone('utc', now()),
  add column if not exists last_seen_at timestamptz not null default timezone('utc', now()),
  add column if not exists last_event_at timestamptz;

update public.profiles
set
  first_seen_at = coalesce(first_seen_at, created_at, timezone('utc', now())),
  last_seen_at = coalesce(last_seen_at, updated_at, timezone('utc', now())),
  last_event_at = coalesce(last_event_at, updated_at, timezone('utc', now()))
where true;

create unique index if not exists profiles_telegram_user_id_uidx
  on public.profiles(telegram_user_id)
  where telegram_user_id is not null;

create index if not exists profiles_last_seen_at_idx
  on public.profiles(last_seen_at desc);

create table if not exists public.player_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  source text not null default 'web',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists player_events_user_created_at_idx
  on public.player_events(user_id, created_at desc);

create index if not exists player_events_type_created_at_idx
  on public.player_events(event_type, created_at desc);

alter table public.player_events enable row level security;

drop policy if exists "Users can read own player events" on public.player_events;
create policy "Users can read own player events"
  on public.player_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own player events" on public.player_events;
create policy "Users can insert own player events"
  on public.player_events
  for insert
  with check (auth.uid() = user_id);

create table if not exists public.admin_bot_subscriptions (
  chat_id bigint primary key,
  telegram_user_id bigint not null,
  username text,
  first_name text,
  last_name text,
  is_active boolean not null default true,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_bot_subscriptions_primary_uidx
  on public.admin_bot_subscriptions(is_primary)
  where is_primary = true;

drop trigger if exists handle_admin_bot_subscriptions_updated_at on public.admin_bot_subscriptions;
create trigger handle_admin_bot_subscriptions_updated_at
before update on public.admin_bot_subscriptions
for each row
execute function public.set_updated_at();

alter table public.admin_bot_subscriptions enable row level security;

create or replace function public.is_valid_admin_secret(p_secret text)
returns boolean
language sql
stable
set search_path = public
as $$
  select encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex')
    = 'b6a301d82d2f5585893041b59298dbbe5f0f3814925ba89533e603a7b18df38a';
$$;

create or replace function public.record_player_event(
  p_event_type text,
  p_source text default 'web',
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  inserted_event public.player_events;
  profile_row public.profiles;
  previous_seen_at timestamptz;
  occurrence_count bigint;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id)
  values (current_uid)
  on conflict (id) do nothing;

  select * into profile_row
  from public.profiles
  where id = current_uid;

  previous_seen_at := profile_row.last_seen_at;

  update public.profiles
  set
    last_seen_at = timezone('utc', now()),
    last_event_at = timezone('utc', now())
  where id = current_uid
  returning * into profile_row;

  insert into public.player_events (user_id, event_type, source, payload)
  values (
    current_uid,
    left(lower(trim(coalesce(p_event_type, 'unknown'))), 64),
    left(lower(trim(coalesce(p_source, 'web'))), 32),
    coalesce(p_payload, '{}'::jsonb)
  )
  returning * into inserted_event;

  select count(*)
  into occurrence_count
  from public.player_events
  where user_id = current_uid
    and event_type = inserted_event.event_type;

  return jsonb_build_object(
    'eventId', inserted_event.id,
    'eventType', inserted_event.event_type,
    'source', inserted_event.source,
    'createdAt', inserted_event.created_at,
    'userId', current_uid,
    'nickname', profile_row.nickname,
    'telegramUserId', profile_row.telegram_user_id,
    'telegramUsername', profile_row.telegram_username,
    'previousSeenAt', previous_seen_at,
    'isFirstOccurrence', occurrence_count = 1
  );
end;
$$;

create or replace function public.sync_telegram_session(
  p_telegram_user_id bigint,
  p_telegram_username text default null,
  p_telegram_first_name text default null,
  p_telegram_last_name text default null,
  p_telegram_language_code text default null,
  p_telegram_photo_url text default null,
  p_telegram_is_premium boolean default false,
  p_start_param text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  profile_row public.profiles;
  previous_seen_at timestamptz;
  session_count bigint;
  normalized_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  if p_telegram_user_id is null then
    raise exception 'Telegram user id is required';
  end if;

  insert into public.profiles (id)
  values (current_uid)
  on conflict (id) do nothing;

  select * into profile_row
  from public.profiles
  where id = current_uid;

  previous_seen_at := profile_row.last_seen_at;

  update public.profiles
  set
    telegram_user_id = p_telegram_user_id,
    telegram_username = nullif(trim(p_telegram_username), ''),
    telegram_first_name = nullif(trim(p_telegram_first_name), ''),
    telegram_last_name = nullif(trim(p_telegram_last_name), ''),
    telegram_language_code = nullif(trim(p_telegram_language_code), ''),
    telegram_photo_url = nullif(trim(p_telegram_photo_url), ''),
    telegram_is_premium = coalesce(p_telegram_is_premium, false),
    telegram_start_param = nullif(trim(p_start_param), ''),
    last_seen_at = timezone('utc', now()),
    last_event_at = timezone('utc', now())
  where id = current_uid
  returning * into profile_row;

  insert into public.player_events (user_id, event_type, source, payload)
  values (
    current_uid,
    'telegram_session',
    'telegram',
    jsonb_build_object(
      'telegramUserId', p_telegram_user_id,
      'telegramUsername', nullif(trim(p_telegram_username), ''),
      'telegramFirstName', nullif(trim(p_telegram_first_name), ''),
      'telegramLastName', nullif(trim(p_telegram_last_name), ''),
      'telegramLanguageCode', nullif(trim(p_telegram_language_code), ''),
      'telegramPhotoUrl', nullif(trim(p_telegram_photo_url), ''),
      'telegramIsPremium', coalesce(p_telegram_is_premium, false),
      'startParam', nullif(trim(p_start_param), '')
    ) || normalized_payload
  );

  select count(*)
  into session_count
  from public.player_events
  where user_id = current_uid
    and event_type = 'telegram_session';

  return jsonb_build_object(
    'userId', current_uid,
    'nickname', profile_row.nickname,
    'telegramUserId', profile_row.telegram_user_id,
    'telegramUsername', profile_row.telegram_username,
    'telegramFirstName', profile_row.telegram_first_name,
    'telegramLastName', profile_row.telegram_last_name,
    'previousSeenAt', previous_seen_at,
    'lastSeenAt', profile_row.last_seen_at,
    'isFirstSession', session_count = 1
  );
end;
$$;

create or replace function public.register_admin_bot_chat(
  p_secret text,
  p_chat_id bigint,
  p_telegram_user_id bigint,
  p_username text default null,
  p_first_name text default null,
  p_last_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_primary public.admin_bot_subscriptions;
begin
  if not public.is_valid_admin_secret(p_secret) then
    raise exception 'Invalid admin secret';
  end if;

  select * into existing_primary
  from public.admin_bot_subscriptions
  where is_primary = true
  order by created_at asc
  limit 1;

  if existing_primary.chat_id is null then
    insert into public.admin_bot_subscriptions (
      chat_id,
      telegram_user_id,
      username,
      first_name,
      last_name,
      is_active,
      is_primary
    )
    values (
      p_chat_id,
      p_telegram_user_id,
      nullif(trim(p_username), ''),
      nullif(trim(p_first_name), ''),
      nullif(trim(p_last_name), ''),
      true,
      true
    )
    on conflict (chat_id) do update
    set
      telegram_user_id = excluded.telegram_user_id,
      username = excluded.username,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      is_active = true,
      is_primary = true,
      updated_at = timezone('utc', now());

    return jsonb_build_object(
      'authorized', true,
      'isPrimary', true,
      'isNewAdmin', true
    );
  end if;

  if existing_primary.telegram_user_id = p_telegram_user_id or existing_primary.chat_id = p_chat_id then
    update public.admin_bot_subscriptions
    set
      username = nullif(trim(p_username), ''),
      first_name = nullif(trim(p_first_name), ''),
      last_name = nullif(trim(p_last_name), ''),
      is_active = true,
      updated_at = timezone('utc', now())
    where chat_id = existing_primary.chat_id;

    return jsonb_build_object(
      'authorized', true,
      'isPrimary', true,
      'isNewAdmin', false
    );
  end if;

  return jsonb_build_object(
    'authorized', false,
    'isPrimary', false,
    'isNewAdmin', false
  );
end;
$$;

create or replace function public.list_admin_bot_chats(p_secret text)
returns table (
  chat_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_valid_admin_secret(p_secret) then
    raise exception 'Invalid admin secret';
  end if;

  return query
  select subs.chat_id
  from public.admin_bot_subscriptions subs
  where subs.is_active = true
    and subs.is_primary = true;
end;
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

  result := jsonb_build_object(
    'totals',
    jsonb_build_object(
      'playersTotal', (select count(*) from public.profiles),
      'telegramPlayers', (select count(*) from public.profiles where telegram_user_id is not null),
      'active24h', (select count(*) from public.profiles where last_seen_at >= timezone('utc', now()) - interval '24 hours'),
      'active7d', (select count(*) from public.profiles where last_seen_at >= timezone('utc', now()) - interval '7 days'),
      'securedAccounts', (select count(*) from public.account_credentials),
      'livePets', (select count(*) from public.pets where died_at is null),
      'deadPets', (select count(*) from public.pets where died_at is not null),
      'eventCount', (select count(*) from public.player_events)
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
      from (
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
        from public.profiles
        order by profiles.last_seen_at desc nulls last
        limit 10
      ) as q
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
      from (
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
        join public.profiles profiles on profiles.id = events.user_id
        order by events.created_at desc
        limit 15
      ) as q
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
    ), '[]'::jsonb)
  );

  return result;
end;
$$;

grant execute on function public.record_player_event(text, text, jsonb) to authenticated;
grant execute on function public.sync_telegram_session(bigint, text, text, text, text, text, boolean, text, jsonb) to authenticated;
grant execute on function public.register_admin_bot_chat(text, bigint, bigint, text, text, text) to anon;
grant execute on function public.list_admin_bot_chats(text) to anon;
grant execute on function public.get_admin_dashboard(text) to anon;
