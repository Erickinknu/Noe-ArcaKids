-- A2: persist geofence enter/exit transitions.
-- The child records real transitions via a device-scoped SECURITY DEFINER RPC
-- (same trust model as check_geofences_for_device); family members read and
-- subscribe in realtime from the NOE app.

create table if not exists public.geofence_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  geofence_id uuid references public.geofences(id) on delete set null,
  geofence_name text,
  device_uuid text,
  event_type text not null check (event_type in ('enter', 'exit')),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists geofence_events_family_id_created_idx
  on public.geofence_events (family_id, created_at desc);
create index if not exists geofence_events_child_id_created_idx
  on public.geofence_events (child_id, created_at desc);

alter table public.geofence_events enable row level security;

do $$ begin
  create policy "Family members can manage geofence events"
    on public.geofence_events for select
    to authenticated
    using (family_id = (select family_id from profiles where user_id = auth.uid()));
exception when duplicate_object then null;
end $$;

grant select on public.geofence_events to authenticated;

-- Device-scoped RPC: records one enter/exit event for the linked device.
create or replace function public.record_geofence_event_for_device(
  p_device_uuid text,
  p_geofence_id uuid,
  p_event_type text,
  p_latitude double precision,
  p_longitude double precision
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_geofence public.geofences%rowtype;
begin
  if p_event_type not in ('enter', 'exit') then
    raise exception 'INVALID_EVENT_TYPE';
  end if;

  select * into v_device
  from public.devices
  where device_uuid = p_device_uuid::uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  select * into v_geofence
  from public.geofences
  where id = p_geofence_id;

  if v_geofence.id is null then
    raise exception 'GEOFENCE_NOT_FOUND';
  end if;

  if v_geofence.child_id <> v_device.child_id then
    raise exception 'GEOFENCE_CHILD_MISMATCH';
  end if;

  insert into public.geofence_events (
    family_id,
    child_id,
    geofence_id,
    geofence_name,
    device_uuid,
    event_type,
    latitude,
    longitude
  )
  values (
    v_device.family_id,
    v_device.child_id,
    v_geofence.id,
    v_geofence.name,
    p_device_uuid,
    p_event_type,
    p_latitude,
    p_longitude
  );
end;
$$;

revoke execute on function public.record_geofence_event_for_device(text, uuid, text, double precision, double precision) from public;
grant execute on function public.record_geofence_event_for_device(text, uuid, text, double precision, double precision) to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.geofence_events;
exception when duplicate_object then null;
end $$;