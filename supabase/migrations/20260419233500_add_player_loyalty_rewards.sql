alter table public.profiles
  add column if not exists account_secured_bonus_granted_at timestamptz,
  add column if not exists telegram_loyalty_bonus_granted_at timestamptz;

create or replace function public.claim_player_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  profile_row public.profiles;
  active_pet public.pets;
  granted_claims jsonb := '[]'::jsonb;
  now_utc timestamptz := timezone('utc', now());
  should_grant_account_bonus boolean := false;
  should_grant_telegram_bonus boolean := false;
  total_amount integer := 0;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id)
  values (current_uid)
  on conflict (id) do nothing;

  select *
  into profile_row
  from public.profiles
  where id = current_uid
  for update;

  select *
  into active_pet
  from public.pets
  where user_id = current_uid
    and died_at is null
  order by born_at desc
  limit 1
  for update;

  if active_pet is not null then
    should_grant_account_bonus :=
      profile_row.account_secured_bonus_granted_at is null
      and exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = current_uid
      );

    should_grant_telegram_bonus :=
      profile_row.telegram_loyalty_bonus_granted_at is null
      and profile_row.telegram_user_id is not null
      and active_pet.born_at <= now_utc - interval '1 minute';
  end if;

  if should_grant_account_bonus or should_grant_telegram_bonus then
    update public.profiles
    set
      account_secured_bonus_granted_at = case
        when should_grant_account_bonus then coalesce(account_secured_bonus_granted_at, now_utc)
        else account_secured_bonus_granted_at
      end,
      telegram_loyalty_bonus_granted_at = case
        when should_grant_telegram_bonus then coalesce(telegram_loyalty_bonus_granted_at, now_utc)
        else telegram_loyalty_bonus_granted_at
      end
    where id = current_uid
    returning * into profile_row;
  end if;

  if should_grant_account_bonus then
    total_amount := total_amount + 100;
    granted_claims := granted_claims || jsonb_build_array(
      jsonb_build_object(
        'type', 'account_secured_bonus',
        'amount', 100
      )
    );
  end if;

  if should_grant_telegram_bonus then
    total_amount := total_amount + 100;
    granted_claims := granted_claims || jsonb_build_array(
      jsonb_build_object(
        'type', 'telegram_loyalty_bonus',
        'amount', 100
      )
    );
  end if;

  if total_amount > 0 and active_pet is not null then
    update public.pets
    set coins = coins + total_amount
    where id = active_pet.id
    returning * into active_pet;
  end if;

  return jsonb_build_object(
    'granted', total_amount > 0,
    'totalAmount', total_amount,
    'coinsAfter', case when active_pet is null then null else active_pet.coins end,
    'petId', case when active_pet is null then null else active_pet.id end,
    'claims', granted_claims
  );
end;
$$;

grant execute on function public.claim_player_rewards() to authenticated;
