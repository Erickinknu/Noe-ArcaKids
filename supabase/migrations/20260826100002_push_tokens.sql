create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'android',
  created_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "Users manage own tokens"
  on push_tokens for all
  using (user_id = auth.uid());
