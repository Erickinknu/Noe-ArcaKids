-- Fase 2 (telemetria real): el dispositivo reporta el modo de sonido
-- (normal / vibracion / silencio) junto al heartbeat de device_status.

alter table public.device_status
  add column if not exists ringer_mode text
  check (ringer_mode is null or ringer_mode in ('normal', 'vibrate', 'silent'));

-- report_device_status: incluir ringer_mode en el upsert. coalesce() preserva el
-- ultimo valor cuando el dispositivo no lo envia en un heartbeat concreto.
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

  v_family_id := coalesce(
    nullif(p_status->>'familyId','')::uuid,
    v_device.family_id
  );
  v_child_id := coalesce(
    nullif(p_status->>'childId','')::uuid,
    v_device.child_id
  );

  insert into public.device_status (device_uuid, family_id, child_id, last_seen, battery, latitude, longitude, current_app, ringer_mode, is_locked)
  values (
    p_device_uuid,
    v_family_id,
    v_child_id,
    now(),
    nullif(p_status->>'battery','')::int,
    nullif(p_status->>'latitude','')::double precision,
    nullif(p_status->>'longitude','')::double precision,
    nullif(p_status->>'currentApp',''),
    nullif(p_status->>'ringerMode',''),
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
        ringer_mode = coalesce(excluded.ringer_mode, public.device_status.ringer_mode),
        is_locked = excluded.is_locked,
        updated_at = now();

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
