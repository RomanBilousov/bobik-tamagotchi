create table if not exists public.account_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  login_name text not null unique,
  password_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint account_credentials_login_length check (char_length(login_name) between 3 and 40)
);

create index if not exists account_credentials_login_name_idx on public.account_credentials(login_name);

drop trigger if exists handle_account_credentials_updated_at on public.account_credentials;
create trigger handle_account_credentials_updated_at
before update on public.account_credentials
for each row
execute function public.set_updated_at();

alter table public.account_credentials enable row level security;

create or replace function public.normalize_login_name(raw_name text)
returns text
language sql
immutable
as $$
  select lower(left(trim(coalesce(raw_name, '')), 40));
$$;

create or replace function public.get_account_access_status()
returns table (
  has_password boolean,
  login_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_uid uuid := auth.uid();
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    exists(
      select 1
      from public.account_credentials credentials
      where credentials.user_id = current_uid
    ) as has_password,
    (
      select credentials.login_name
      from public.account_credentials credentials
      where credentials.user_id = current_uid
    ) as login_name;
end;
$$;

create or replace function public.upsert_account_access(
  input_login_name text,
  input_new_password text,
  input_current_password text default null
)
returns table (
  has_password boolean,
  login_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_uid uuid := auth.uid();
  normalized_login text := public.normalize_login_name(input_login_name);
  existing_credential public.account_credentials%rowtype;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(normalized_login) < 3 then
    raise exception 'Login name must be at least 3 characters';
  end if;

  if char_length(coalesce(input_new_password, '')) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  if exists(
    select 1
    from public.account_credentials credentials
    where credentials.login_name = normalized_login
      and credentials.user_id <> current_uid
  ) then
    raise exception 'This login name is already taken';
  end if;

  select *
  into existing_credential
  from public.account_credentials credentials
  where credentials.user_id = current_uid
  for update;

  if not found then
    insert into public.account_credentials (
      user_id,
      login_name,
      password_hash
    )
    values (
      current_uid,
      normalized_login,
      crypt(input_new_password, gen_salt('bf'))
    );
  else
    if coalesce(input_current_password, '') = '' then
      raise exception 'Current password is required';
    end if;

    if crypt(input_current_password, existing_credential.password_hash) <> existing_credential.password_hash then
      raise exception 'Current password is incorrect';
    end if;

    update public.account_credentials
    set
      login_name = normalized_login,
      password_hash = crypt(input_new_password, gen_salt('bf'))
    where user_id = current_uid;
  end if;

  return query
  select true as has_password, normalized_login as login_name;
end;
$$;

create or replace function public.restore_account_access(
  input_login_name text,
  input_password text
)
returns table (
  restored boolean,
  login_name text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_uid uuid := auth.uid();
  normalized_login text := public.normalize_login_name(input_login_name);
  target_credential public.account_credentials%rowtype;
begin
  if current_uid is null then
    raise exception 'Authentication required';
  end if;

  if char_length(normalized_login) < 3 then
    raise exception 'Login name must be at least 3 characters';
  end if;

  if char_length(coalesce(input_password, '')) < 1 then
    raise exception 'Password is required';
  end if;

  select *
  into target_credential
  from public.account_credentials credentials
  where credentials.login_name = normalized_login
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  if crypt(input_password, target_credential.password_hash) <> target_credential.password_hash then
    raise exception 'Incorrect password';
  end if;

  if target_credential.user_id = current_uid then
    return query
    select true as restored, normalized_login as login_name;
    return;
  end if;

  delete from public.pets where user_id = current_uid;
  delete from public.account_credentials where user_id = current_uid;
  delete from public.profiles where id = current_uid;

  update public.profiles
  set id = current_uid
  where id = target_credential.user_id;

  update public.pets
  set user_id = current_uid
  where user_id = target_credential.user_id;

  update public.account_credentials
  set user_id = current_uid
  where user_id = target_credential.user_id;

  return query
  select true as restored, normalized_login as login_name;
end;
$$;

grant execute on function public.get_account_access_status() to authenticated;
grant execute on function public.upsert_account_access(text, text, text) to authenticated;
grant execute on function public.restore_account_access(text, text) to authenticated;
