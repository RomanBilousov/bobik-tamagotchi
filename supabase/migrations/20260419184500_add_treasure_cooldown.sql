alter table public.pets
  add column if not exists treasure_ready_at timestamptz;
