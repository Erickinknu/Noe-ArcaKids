-- Fase 3: las funciones de trigger no deben ser invocables vía RPC.
-- El disparo de triggers no requiere EXECUTE para el rol que hace DML,
-- así que revocamos el grant público por defecto.
revoke all on function public.notify_unlock_request() from public, anon, authenticated;
revoke all on function public.notify_geofence_event() from public, anon, authenticated;
revoke all on function public.notify_device_alert() from public, anon, authenticated;
