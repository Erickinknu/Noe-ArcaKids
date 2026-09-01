-- Geofence check RPC for ARCA KIDS child app
-- Returns enter/exit events for a child's current location

create or replace function public.check_geofences(
  p_child_id uuid,
  p_latitude double precision,
  p_longitude double precision
)
returns table (
  geofence_id uuid,
  child_id uuid,
  type text,
  event_time timestamptz,
  latitude double precision,
  longitude double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_geofence record;
  v_distance double precision;
  v_inside boolean;
  v_event_type text;
begin
  for v_geofence in
    select id, child_id, latitude, longitude, radius
    from public.geofences
    where child_id = p_child_id
      and enabled = true
  loop
    -- Calculate distance using Haversine formula (meters)
    v_distance := public.haversine_distance(
      p_latitude, p_longitude,
      v_geofence.latitude, v_geofence.longitude
    );

    v_inside := v_distance <= v_geofence.radius;
    v_event_type := case when v_inside then 'enter' else 'exit' end;

    -- Return event (both enter and exit for real-time check)
    return query select
      v_geofence.id,
      v_geofence.child_id,
      v_event_type,
      now() as event_time,
      p_latitude,
      p_longitude;
  end loop;
end;
$$;

-- Haversine distance helper (meters)
create or replace function public.haversine_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 2 * 6371000 * asin(
    sqrt(
      power(sin((radians(lat2) - radians(lat1)) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin((radians(lon2) - radians(lon1)) / 2), 2)
    )
  );
$$;

-- Grant execute to authenticated (for anon child device)
grant execute on function public.check_geofences(uuid, double precision, double precision) to authenticated;
grant execute on function public.haversine_distance(double precision, double precision, double precision, double precision) to authenticated;