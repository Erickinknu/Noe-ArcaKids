create extension if not exists "pgcrypto" with schema "extensions";

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete set null,
  name text not null,
  platform text not null check (platform in ('android', 'ios')),
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_family_id_idx on public.profiles (family_id);
create index if not exists children_family_id_idx on public.children (family_id);
create index if not exists devices_child_id_idx on public.devices (child_id);
create index if not exists sessions_child_id_idx on public.sessions (child_id);

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.devices enable row level security;
alter table public.sessions enable row level security;

create or replace function public.is_family_member(family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.family_id = is_family_member.family_id
      and p.user_id = auth.uid()
  );
$$;

revoke execute on function public.is_family_member(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;

create policy "family members can read families" on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy "family members can read profiles" on public.profiles
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "family members can read children" on public.children
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "family members can read devices" on public.devices
  for select to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = devices.child_id
        and public.is_family_member(c.family_id)
    )
  );

create policy "family members can read sessions" on public.sessions
  for select to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );

grant select on public.families, public.profiles, public.children, public.devices, public.sessions to authenticated;