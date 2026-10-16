-- Retirar geocercas (decision de producto): se conserva SOLO la ubicacion en
-- tiempo real (devices.latitude/longitude + get_children_locations). Esta
-- migracion elimina tablas, trigger, RPCs y funcion auxiliar asociadas a
-- geocercas, y quita el tipo 'geofence' de las notificaciones. Idempotente.

-- 1) Trigger de notificacion ligado a geofence_events.
drop trigger if exists trg_notify_geofence_event on public.geofence_events;
drop function if exists public.notify_geofence_event();

-- 2) Tablas (FK geofence_events -> geofences).
drop table if exists public.geofence_events cascade;
drop table if exists public.geofences cascade;

-- 3) RPCs de dispositivo y funcion auxiliar (solo usada por check_geofences_for_device).
drop function if exists public.record_geofence_event_for_device(text, uuid, text, double precision, double precision);
drop function if exists public.check_geofences_for_device(text, double precision, double precision);
drop function if exists public.haversine_distance(double precision, double precision, double precision, double precision);

-- 4) Quitar 'geofence' del tipo de notificaciones (no hay filas con ese tipo).
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('unlock_request', 'sos', 'offline', 'time_goal', 'system'));
