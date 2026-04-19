create or replace function public.claim_player_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  active_pet_id uuid;
  active_pet_born_at timestamptz;
  active_pet_coins integer;
  granted_claims jsonb := '[]'::jsonb;
  now_utc timestamptz := timezone('utc', now());
  total_amount integer := 0;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id)
  values (current_uid)
  on conflict (id) do nothing;

  select pets.id, pets.born_at, pets.coins
  into active_pet_id, active_pet_born_at, active_pet_coins
  from public.pets
  where pets.user_id = current_uid
    and pets.died_at is null
  order by pets.born_at desc
  limit 1
  for update;

  if active_pet_id is not null then
    update public.profiles
    set account_secured_bonus_granted_at = now_utc
    where id = current_uid
      and account_secured_bonus_granted_at is null
      and exists(
        select 1
        from public.account_credentials credentials
        where credentials.user_id = current_uid
      );

    if found then
      total_amount := total_amount + 100;
      granted_claims := granted_claims || jsonb_build_array(
        jsonb_build_object(
          'type', 'account_secured_bonus',
          'amount', 100
        )
      );
    end if;

    update public.profiles
    set telegram_loyalty_bonus_granted_at = now_utc
    where id = current_uid
      and telegram_loyalty_bonus_granted_at is null
      and telegram_user_id is not null
      and active_pet_born_at <= now_utc - interval '1 minute';

    if found then
      total_amount := total_amount + 100;
      granted_claims := granted_claims || jsonb_build_array(
        jsonb_build_object(
          'type', 'telegram_loyalty_bonus',
          'amount', 100
        )
      );
    end if;

    if total_amount > 0 then
      update public.pets
      set coins = coins + total_amount
      where id = active_pet_id
      returning coins into active_pet_coins;
    end if;
  end if;

  return jsonb_build_object(
    'granted', total_amount > 0,
    'totalAmount', total_amount,
    'coinsAfter', active_pet_coins,
    'petId', active_pet_id,
    'claims', granted_claims
  );
end;
$$;

grant execute on function public.claim_player_rewards() to authenticated;
