-- Ajustes al linter de seguridad para la fase 11 (control total del dispositivo):
-- 1) device_command_events: RLS activo con política SELECT explícita para
--    anon/authenticated (patrón broadcast; el filtro device_uuid del suscriptor
--    limita qué eventos entrega Realtime).
-- 2) La función de trigger broadcast_device_command no debe ser ejecutable vía REST.

alter table public.device_command_events enable row level security;

drop policy if exists "broadcast events readable by devices" on public.device_command_events;
create policy "broadcast events readable by devices"
  on public.device_command_events
  for select
  to anon, authenticated
  using (true);

revoke execute on function public.broadcast_device_command() from public, anon;