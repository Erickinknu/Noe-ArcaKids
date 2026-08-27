-- FASE 10: Device Owner + control remoto total NOE -> Arcakids
-- Tables for remote policy, commands, and status with Realtime.
-- Anon/child path is via SECURITY DEFINER RPCs scoped by device_uuid (same trust model as redeem_pairing_code).
-- Parent path uses RLS with is_family_parent / is_family_member helpers.

-- ── device_policies: one row per device_uuid, source of truth for rules ──
create table if not exists public.device_policies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  device_uuid text not null unique,
  daily_limit_minutes int check (daily_limit_minutes is null or daily_limit_minutes between 0 and 1440),
  bedtime_enabled boolean not null default false,
  bedtime_start time,
  bedtime_end time,
  blocked_packages text[] not null default '{}'::text[],
  updated_at timestamptz not null default now(),
  check (
    bedtime_enabled = false
    or (bedtime_start is not null and bedtime_end is not null)
  )
);

-- ── device_commands: queue consumed by Arcakids via Realtime or polling ──
create table if not exists public.device_commands (
  id uuid primary key default gen_random_uuid(),
  device_uuid text not null,
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  command text not null check (command in ('LOCK','UNLOCK','BLOCK_APPS','UNBLOCK_APPS','SET_POLICY','REQUEST_LOCATION')),
  payload jsonb,
  status text not null default 'pending' check (status in ('pending','executed','failed','expired')),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create index if not exists device_commands_device_uuid_status_idx on public.device_commands (device_uuid, status, created_at desc);
create index if not exists device_commands_family_id_idx on public.device_commands (family_id);

-- ── device_status: last-seen heartbeat reported by child device ──
create table if not exists public.device_status (
  device_uuid text primary key,
  family_id uuid references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  last_seen timestamptz not null default now(),
  battery int check (battery is null or battery between 0 and 100),
  latitude double precision,
  longitude double precision,
  current_app text,
  is_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists device_status_family_id_idx on public.device_status (family_id);

create trigger device_policies_set_updated_at
  before update on public.device_policies
  for each row execute function public.set_updated_at();

create trigger device_status_set_updated_at
  before update on public.device_status
  for each row execute function public.set_updated_at();

alter table public.device_policies enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_status enable row level security;

-- RLS: parents CRUD where family_id matches; members read
do $$ begin
  create policy "parents can manage device_policies" on public.device_policies
    for all to authenticated
    using (public.is_family_parent(family_id))
    with check (public.is_family_parent(family_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members can read device_policies" on public.device_policies
    for select to authenticated
    using (public.is_family_member(family_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "parents can manage device_commands" on public.device_commands
    for all to authenticated
    using (public.is_family_parent(family_id))
    with check (public.is_family_parent(family_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members can read device_commands" on public.device_commands
    for select to authenticated
    using (public.is_family_member(family_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "parents can manage device_status" on public.device_status
    for all to authenticated
    using (
      family_id is null
      or public.is_family_parent(family_id)
      or public.is_family_member(family_id)
    )
    with check (public.is_family_parent(family_id));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "members can read device_status" on public.device_status
    for select to authenticated
    using (family_id is null or public.is_family_member(family_id));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on public.device_policies to authenticated;
grant select, insert, update, delete on public.device_commands to authenticated;
grant select, insert, update, delete on public.device_status to authenticated;

-- Close anon direct access: child app must use RPCs below
revoke all on public.device_policies from anon;
revoke all on public.device_commands from anon;
revoke all on public.device_status from anon;

-- ── RPCs for child device (anon) scoped by device_uuid ──

create or replace function public.get_device_commands_for_device(p_device_uuid text)
returns table (
  id uuid,
  device_uuid text,
  family_id uuid,
  child_id uuid,
  command text,
  payload jsonb,
  status text,
  created_at timestamptz,
  executed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select dc.id, dc.device_uuid, dc.family_id, dc.child_id, dc.command, dc.payload, dc.status, dc.created_at, dc.executed_at
  from public.device_commands dc
  where dc.device_uuid = p_device_uuid
    and dc.status = 'pending'
  order by dc.created_at asc
  limit 50;
$$;

create or replace function public.ack_device_command(p_command_id uuid, p_device_uuid text, p_status text default 'executed')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.device_commands
  set status = p_status,
      executed_at = now()
  where id = p_command_id
    and device_uuid = p_device_uuid;
end;
$$;

create or replace function public.report_device_status(p_device_uuid text, p_status jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_family_id uuid;
  v_child_id uuid;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;

  -- Fallback: allow reporting even before pairing; family/child from payload or device row
  v_family_id := coalesce(
    nullif(p_status->>'familyId','')::uuid,
    v_device.family_id
  );
  v_child_id := coalesce(
    nullif(p_status->>'childId','')::uuid,
    v_device.child_id
  );

  insert into public.device_status (device_uuid, family_id, child_id, last_seen, battery, latitude, longitude, current_app, is_locked)
  values (
    p_device_uuid,
    v_family_id,
    v_child_id,
    now(),
    nullif(p_status->>'battery','')::int,
    nullif(p_status->>'latitude','')::double precision,
    nullif(p_status->>'longitude','')::double precision,
    nullif(p_status->>'currentApp',''),
    coalesce((p_status->>'isLocked')::boolean, false)
  )
  on conflict (device_uuid) do update
    set family_id = coalesce(excluded.family_id, public.device_status.family_id),
        child_id = coalesce(excluded.child_id, public.device_status.child_id),
        last_seen = now(),
        battery = coalesce(excluded.battery, public.device_status.battery),
        latitude = coalesce(excluded.latitude, public.device_status.latitude),
        longitude = coalesce(excluded.longitude, public.device_status.longitude),
        current_app = coalesce(excluded.current_app, public.device_status.current_app),
        is_locked = excluded.is_locked,
        updated_at = now();

  -- Mirror location/battery into devices for legacy get_children_locations() compatibility when linked
  if v_device.id is not null and p_status ? 'latitude' and p_status ? 'longitude' then
    update public.devices
    set latitude = nullif(p_status->>'latitude','')::double precision,
        longitude = nullif(p_status->>'longitude','')::double precision,
        location_updated_at = now(),
        last_seen_at = now()
    where id = v_device.id;
  elsif v_device.id is not null then
    update public.devices set last_seen_at = now() where id = v_device.id;
  end if;
end;
$$;

-- ── RPCs for parent (authenticated) to enqueue commands ──

create or replace function public.enqueue_device_command(
  p_device_uuid text,
  p_command text,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_device public.devices%rowtype;
begin
  if p_command not in ('LOCK','UNLOCK','BLOCK_APPS','UNBLOCK_APPS','SET_POLICY','REQUEST_LOCATION') then
    raise exception 'INVALID_COMMAND';
  end if;

  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    -- Allow enqueue by device_uuid text even if not yet linked as uuid (provisioning flow)
    -- Resolve family from device_status if present
    insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
    select p_device_uuid, ds.family_id, ds.child_id, p_command, p_payload
    from public.device_status ds where ds.device_uuid = p_device_uuid
    limit 1
    returning id into v_id;

    if v_id is null then
      raise exception 'DEVICE_NOT_FOUND';
    end if;
    return v_id;
  end if;

  if not public.is_family_parent(v_device.family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
  values (p_device_uuid, v_device.family_id, v_device.child_id, p_command, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.upsert_device_policy(
  p_device_uuid text,
  p_daily_limit_minutes int default null,
  p_bedtime_enabled boolean default null,
  p_bedtime_start time default null,
  p_bedtime_end time default null,
  p_blocked_packages text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_family_id uuid;
  v_child_id uuid;
  v_id uuid;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is not null then
    if not public.is_family_parent(v_device.family_id) then
      raise exception 'NOT_AUTHORIZED';
    end if;
    v_family_id := v_device.family_id;
    v_child_id := v_device.child_id;
  else
    -- Provisioning: resolve from device_status
    select family_id, child_id into v_family_id, v_child_id
    from public.device_status where device_uuid = p_device_uuid limit 1;
    if v_family_id is null or not public.is_family_parent(v_family_id) then
      raise exception 'NOT_AUTHORIZED';
    end if;
  end if;

  insert into public.device_policies (device_uuid, family_id, child_id, daily_limit_minutes, bedtime_enabled, bedtime_start, bedtime_end, blocked_packages)
  values (
    p_device_uuid, v_family_id, v_child_id,
    p_daily_limit_minutes, coalesce(p_bedtime_enabled, false), p_bedtime_start, p_bedtime_end, coalesce(p_blocked_packages, '{}'::text[])
  )
  on conflict (device_uuid) do update
    set daily_limit_minutes = coalesce(excluded.daily_limit_minutes, public.device_policies.daily_limit_minutes),
        bedtime_enabled = coalesce(excluded.bedtime_enabled, public.device_policies.bedtime_enabled),
        bedtime_start = coalesce(excluded.bedtime_start, public.device_policies.bedtime_start),
        bedtime_end = coalesce(excluded.bedtime_end, public.device_policies.bedtime_end),
        blocked_packages = coalesce(excluded.blocked_packages, public.device_policies.blocked_packages),
        child_id = coalesce(excluded.child_id, public.device_policies.child_id),
        family_id = excluded.family_id,
        updated_at = now()
  returning id into v_id;

  -- Also enqueue a SET_POLICY command so the device pulls it via Realtime
  insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
  values (p_device_uuid, v_family_id, v_child_id, 'SET_POLICY', jsonb_build_object(
    'daily_limit_minutes', p_daily_limit_minutes,
    'bedtime_enabled', p_bedtime_enabled,
    'bedtime_start', p_bedtime_start::text,
    'bedtime_end', p_bedtime_end::text,
    'blocked_packages', p_blocked_packages
  ));

  return v_id;
end;
$$;

revoke execute on function public.get_device_commands_for_device(text) from public;
grant execute on function public.get_device_commands_for_device(text) to anon, authenticated;

revoke execute on function public.ack_device_command(uuid, text, text) from public;
grant execute on function public.ack_device_command(uuid, text, text) to anon, authenticated;

revoke execute on function public.report_device_status(text, jsonb) from public;
grant execute on function public.report_device_status(text, jsonb) to anon, authenticated;

revoke execute on function public.enqueue_device_command(text, text, jsonb) from public;
grant execute on function public.enqueue_device_command(text, text, jsonb) to authenticated;

revoke execute on function public.upsert_device_policy(text, int, boolean, time, time, text[]) from public;
grant execute on function public.upsert_device_policy(text, int, boolean, time, time, text[]) to authenticated;

-- Realtime publication (idempotent: add each table if not already member)
do $$ begin
  alter publication supabase_realtime add table public.device_commands;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.device_policies;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.device_status;
exception when duplicate_object then null; end $$;
