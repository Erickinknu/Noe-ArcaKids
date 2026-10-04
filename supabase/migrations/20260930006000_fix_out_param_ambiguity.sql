-- Corregir la ambiguedad entre los parametros OUT de RETURNS TABLE y las
-- columnas de las tablas consultadas.
--
-- Por que:
--
--   En plpgsql, los nombres declarados en RETURNS TABLE se convierten en
--   variables de la funcion. Una columna sin calificar que se llame igual que
--   uno de esos parametros deja de ser resoluble y PostgreSQL aborta con
--   42702 'column reference X is ambiguous'.
--
--   check_geofences_for_device declara OUT (geofence_id, child_id, type,
--   event_time, latitude, longitude) y hacia
--     select id, child_id, latitude, longitude, radius
--       from public.geofences
--      where child_id = v_device.child_id
--   Es decir, 'child_id', 'latitude' y 'longitude' quedaban sin calificar.
--
--   get_app_categories_for_device declara OUT (id, package_name, ...) y hacia
--     update public.devices set last_seen_at = now() where id = v_device.id
--   donde 'id' queda sin calificar.
--
--   Ninguna de las dos funciones podia completarse nunca: devolvian 42702
--   tambien al dispositivo legitimo. El guard de propiedad se evaluaba antes
--   y por eso el acceso desde otro dispositivo si se rechazaba correctamente;
--   el fallo era de funcionalidad y quedaba enmascarado por las pruebas de
--   denegacion.
--
-- Se reescriben por completo porque CREATE OR REPLACE no puede cambiar el
-- cuerpo, y se conserva el guard como primera sentencia.

-- ─────────────────────────────────────────────────────────────────────────────
-- check_geofences_for_device
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.check_geofences_for_device(
  p_device_uuid text,
  p_latitude     double precision,
  p_longitude    double precision
)
returns table(
  geofence_id uuid,
  child_id    uuid,
  type        text,
  event_time  timestamptz,
  latitude    double precision,
  longitude   double precision
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device     public.devices%rowtype;
  v_geofence   record;
  v_distance   double precision;
  v_inside     boolean;
  v_event_type text;
begin
  perform public.assert_device_claim_text(p_device_uuid::text);

  select * into v_device
    from public.devices
   where device_uuid = p_device_uuid::uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  -- Todas las columnas de geofences se prefijan con g_ para no chocar con los
  -- parametros OUT child_id, latitude y longitude.
  for v_geofence in
    select g.id         as geofence_id,
           g.child_id   as child_id,
           g.latitude   as latitude,
           g.longitude  as longitude,
           g.radius     as radius
      from public.geofences g
     where g.child_id = v_device.child_id
       and g.enabled = true
  loop
    v_distance := public.haversine_distance(
      p_latitude, p_longitude,
      v_geofence.latitude, v_geofence.longitude
    );

    v_inside := v_distance <= v_geofence.radius;
    v_event_type := case when v_inside then 'enter' else 'exit' end;

    return query
      select v_geofence.geofence_id,
             v_geofence.child_id,
             v_event_type,
             now(),
             p_latitude,
             p_longitude;
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_app_categories_for_device
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_app_categories_for_device(p_device_uuid text)
returns table(
  id                 uuid,
  package_name       text,
  app_label          text,
  category           text,
  time_limit_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  perform public.assert_device_claim_text(p_device_uuid::text);

  select * into v_device
    from public.devices
   where device_uuid = p_device_uuid::uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  -- 'id' se califica porque es tambien un parametro OUT de esta funcion.
  update public.devices d
     set last_seen_at = now()
   where d.id = v_device.id;

  return query
    select a.id, a.package_name, a.app_label, a.category, a.time_limit_minutes
      from public.app_categories a
     where a.child_id = v_device.child_id
     order by a.category, a.app_label;
end;
$$;

revoke all on function public.check_geofences_for_device(text, double precision, double precision) from public, anon;
revoke all on function public.get_app_categories_for_device(text) from public, anon;

grant execute on function public.check_geofences_for_device(text, double precision, double precision) to authenticated, service_role;
grant execute on function public.get_app_categories_for_device(text) to authenticated, service_role;
