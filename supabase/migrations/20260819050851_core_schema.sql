-- Core schema: families, profiles (parent/child roles), children, devices, sessions.
-- Phase 1-3 scope: auth, family setup, children management, device linking foundation.

create extension if not exists "pgcrypto" with schema "extensions";

create type public.app_role as enum ('parent', 'child');

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  avatar_url text,
  role public.app_role not null default 'parent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  device_uuid uuid not null unique,
  name text not null,
  platform text not null check (platform in ('android', 'ios')),
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index profiles_family_id_idx on public.profiles (family_id);
create index children_family_id_idx on public.children (family_id);
create index devices_family_id_idx on public.devices (family_id);
create index devices_child_id_idx on public.devices (child_id);
create index sessions_child_id_idx on public.sessions (child_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger families_set_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger children_set_updated_at
  before update on public.children
  for each row execute function public.set_updated_at();

create trigger devices_set_updated_at
  before update on public.devices
  for each row execute function public.set_updated_at();

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.devices enable row level security;
alter table public.sessions enable row level security;