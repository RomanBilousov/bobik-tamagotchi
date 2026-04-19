alter table public.pets
  add column if not exists owned_hats jsonb not null default '[]'::jsonb,
  add column if not exists active_hat text;

update public.pets
set
  owned_hats = '["magic_hat"]'::jsonb,
  active_hat = 'magic_hat'
where has_hat = true
  and coalesce(active_hat, '') = ''
  and coalesce(jsonb_array_length(owned_hats), 0) = 0;

update public.pets
set has_hat = jsonb_array_length(owned_hats) > 0;
