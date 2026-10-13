-- Permisos mínimos en analytics_events: solo INSERT para anon/authenticated
-- (sin SELECT; la lectura es con service_role). Aplicado originalmente como
-- migración separada tras detectar 401 en el smoke test del cliente.
grant insert on public.analytics_events to anon, authenticated;
