-- ---------------------------------------------------------------------------
-- study_mode_events privacy fix
--
-- 20260928000000 created study_mode_events as an append-only broadcast table
-- keyed by child_id, with the full schedule in `payload` and a SELECT policy
-- of `using (true)` for anon. The child app authenticates as `anon` and the
-- public anon key ships inside the ARCA KIDS APK, so every client could read
-- every family's study schedule. anon additionally held INSERT/UPDATE/DELETE/
-- TRUNCATE grants on the table.
--
-- This migration aligns the table with the pattern already used by
-- `device_policy_events` in command-subscription.ts: events are keyed by
-- device, carry no schedule data, and only SELECT is granted.
-- ---------------------------------------------------------------------------

alter table public.study_mode_events
  add column if not exists device_uuid uuid;

create index if not exists idx_study_mode_events_device
  on public.study_mode_events (device_uuid, created_at desc);

create index if not exists idx_study_mode_events_created_at
  on public.study_mode_events (created_at);

-- Backfill anything emitted before this fix, then drop the schedule payload.
update public.study_mode_events e
   set device_uuid = d.device_uuid
  from public.devices d
 where d.child_id = e.child_id
   and e.device_uuid is null;

update public.study_mode_events
   set payload = null
 where payload is not null;

-- ---------------------------------------------------------------------------
-- Fan out one event per linked device so the child can filter on its own
-- device instead of receiving every family's changes. The row is a signal
-- only: the device refetches through get_study_mode_schedule_for_device().
-- ---------------------------------------------------------------------------
create or replace function public.broadcast_study_mode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.study_mode_events (device_uuid, event)
  select d.device_uuid, 'changed'
    from public.devices d
   where d.child_id = new.child_id;

  -- Keep the table bounded. pg_cron is not available on this project, and the
  -- write volume here is tiny, so pruning inline avoids a new extension
  -- dependency while still bounding the table.
  perform public.prune_study_mode_events();

  return new;
end;
$$;

revoke all on function public.broadcast_study_mode() from public;

-- anon may read the change signal, nothing else.
revoke all on public.study_mode_events from anon, authenticated;
grant select on public.study_mode_events to anon, authenticated;

create or replace function public.prune_study_mode_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.study_mode_events
   where created_at < now() - interval '1 day';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.prune_study_mode_events() from public;
