-- Study mode: authorization hardening, device-scoped reads, per-day hours, realtime.
--
-- Context: study_mode_schedules existed but nothing consumed it from the child
-- device, and both RPCs were SECURITY DEFINER without verifying the caller's
-- family. Any authenticated parent could read or overwrite the schedule of a
-- child belonging to a different family by passing an arbitrary p_child_id.

-- ---------------------------------------------------------------------------
-- Helper: unwrap legacy double-encoded jsonb.
--
-- The parent app used to send JSON.stringify(...) for jsonb parameters, which
-- made PostgREST store a JSON *string* inside the column instead of an
-- array/object. Normalize on read and on write so both shapes work.
-- ---------------------------------------------------------------------------
create or replace function public.study_mode_normalize_jsonb(p_value jsonb)
returns jsonb
language sql
immutable
set search_path = 'pg_catalog', 'public'
as $$
  select case
    when p_value is null then null
    when jsonb_typeof(p_value) = 'string'
         and left(btrim(p_value #>> '{}'), 1) in ('[', '{')
      then (p_value #>> '{}')::jsonb
    else p_value
  end;
$$;

revoke execute on function public.study_mode_normalize_jsonb(jsonb) from public;
grant execute on function public.study_mode_normalize_jsonb(jsonb) to authenticated;

-- Repair any rows already corrupted by the double encoding.
update public.study_mode_schedules
set blocked_packages = public.study_mode_normalize_jsonb(blocked_packages),
    days = public.study_mode_normalize_jsonb(days),
    hours = public.study_mode_normalize_jsonb(hours)
where jsonb_typeof(blocked_packages) = 'string'
   or jsonb_typeof(days) = 'string'
   or jsonb_typeof(hours) = 'string';

-- Per-day windows are an object keyed by weekday, not a single global window.
alter table public.study_mode_schedules alter column hours set default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Parent read: keep the same shape NOE already consumes, but verify the caller
-- actually parents this child.
-- ---------------------------------------------------------------------------
create or replace function public.get_study_mode_schedule(p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_family_id uuid;
begin
  select c.family_id into v_family_id
  from public.children c
  where c.id = p_child_id;

  if v_family_id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return coalesce(
    (
      select jsonb_build_object(
        'enabled', sms.enabled,
        'blocked_packages', public.study_mode_normalize_jsonb(sms.blocked_packages),
        'days', public.study_mode_normalize_jsonb(sms.days),
        'hours', public.study_mode_normalize_jsonb(sms.hours)
      )
      from public.study_mode_schedules sms
      where sms.child_id = p_child_id
    ),
    '{"enabled": false, "blocked_packages": [], "days": [], "hours": {}}'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Parent write: SECURITY DEFINER with no family check let any authenticated
-- user overwrite any child's schedule. Verify parent role against the child.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_study_mode_schedule(
  p_child_id uuid,
  p_enabled boolean,
  p_blocked_packages jsonb,
  p_days jsonb,
  p_hours jsonb
)
returns void
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_family_id uuid;
begin
  select c.family_id into v_family_id
  from public.children c
  where c.id = p_child_id;

  if v_family_id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public.study_mode_schedules
    (family_id, child_id, enabled, blocked_packages, days, hours)
  values (
    v_family_id,
    p_child_id,
    coalesce(p_enabled, false),
    coalesce(public.study_mode_normalize_jsonb(p_blocked_packages), '[]'::jsonb),
    coalesce(public.study_mode_normalize_jsonb(p_days), '[]'::jsonb),
    coalesce(public.study_mode_normalize_jsonb(p_hours), '{}'::jsonb)
  )
  on conflict (child_id)
  do update set
    enabled = excluded.enabled,
    blocked_packages = excluded.blocked_packages,
    days = excluded.days,
    hours = excluded.hours,
    updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Device read: the child device authenticates as anon and holds only its own
-- device UUID, so the child_id can never be supplied by the caller. Mirrors
-- get_app_categories_for_device.
-- ---------------------------------------------------------------------------
create or replace function public.get_study_mode_schedule_for_device(p_device_uuid text)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
declare
  v_device public.devices%rowtype;
begin
  select * into v_device
  from public.devices
  where device_uuid = p_device_uuid::uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  update public.devices set last_seen_at = now() where id = v_device.id;

  return coalesce(
    (
      select jsonb_build_object(
        'enabled', sms.enabled,
        'blocked_packages', public.study_mode_normalize_jsonb(sms.blocked_packages),
        'days', public.study_mode_normalize_jsonb(sms.days),
        'hours', public.study_mode_normalize_jsonb(sms.hours)
      )
      from public.study_mode_schedules sms
      where sms.child_id = v_device.child_id
    ),
    '{"enabled": false, "blocked_packages": [], "days": [], "hours": {}}'::jsonb
  );
end;
$$;

revoke execute on function public.get_study_mode_schedule_for_device(text) from public;
grant execute on function public.get_study_mode_schedule_for_device(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: broadcast schedule changes so the child refetches immediately
-- instead of waiting for its next poll.
-- ---------------------------------------------------------------------------
create table if not exists public.study_mode_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references public.children(id) on delete cascade,
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.study_mode_events enable row level security;

drop policy if exists "study mode events readable by devices" on public.study_mode_events;
create policy "study mode events readable by devices"
  on public.study_mode_events
  for select
  to anon, authenticated
  using (true);

grant select on public.study_mode_events to anon, authenticated;

create or replace function public.broadcast_study_mode()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog', 'public'
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.study_mode_events (child_id, event, payload)
    values (
      old.child_id,
      tg_op,
      jsonb_build_object(
        'enabled', false,
        'days', '[]'::jsonb,
        'hours', '{}'::jsonb,
        'blocked_packages', '[]'::jsonb
      )
    );
    return old;
  end if;

  insert into public.study_mode_events (child_id, event, payload)
  values (
    new.child_id,
    tg_op,
    jsonb_build_object(
      'enabled', new.enabled,
      'days', public.study_mode_normalize_jsonb(new.days),
      'hours', public.study_mode_normalize_jsonb(new.hours),
      'blocked_packages', public.study_mode_normalize_jsonb(new.blocked_packages)
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_broadcast_study_mode on public.study_mode_schedules;
create trigger trg_broadcast_study_mode
  after insert or update or delete on public.study_mode_schedules
  for each row execute function public.broadcast_study_mode();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_mode_events'
  ) then
    alter publication supabase_realtime add table public.study_mode_events;
  end if;
end $$;
