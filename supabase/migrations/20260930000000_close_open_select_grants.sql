-- Cierra las políticas SELECT using(true) y los grants sobrantes a anon.
--
-- Contexto: la anon key es pública. Las tablas de eventos de dispositivo
-- concedían SELECT con using(true), lo que exponía TODOS los device_uuid a
-- cualquier cliente. Como 15 funciones SECURITY DEFINER aceptan p_device_uuid
-- y son ejecutables por anon, conocer un device_uuid equivalía a
-- autenticarse: se pudo leer el estado de dispositivos de otra familia y
-- pedir el hash del PIN familiar.
--
-- Este script es mitigación, no el cierre definitivo: las 15 funciones siguen
-- autorizando por un parámetro sin prueba de posesión. Al sellar el SELECT, el
-- device_uuid deja de ser enumerable (UUID v4, 122 bits), lo que corta la vía
-- de obtención. El cierre real llega con la credencial por dispositivo.
--
-- Coste aceptado: las 3 suscripciones postgres_changes sobre estas tablas
-- dejan de entregar eventos. El child app pasa a depender de polling, que ya
-- tenía como respaldo (get_device_commands_for_device cada SYNC_INTERVAL_MS,
-- syncRulesEnforcement cada 15s, servicio nativo cada 15-60s).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tier 1: tablas de eventos de dispositivo
-- ─────────────────────────────────────────────────────────────────────────────
-- Se elimina la política using(true) y se revocan todos los privilegios de
-- api a anon/authenticated. Los triggers broadcast_* son SECURITY DEFINER de
-- postgres, así que siguen insertando sin necesitar estos grants.

drop policy if exists "broadcast events readable by devices" on public.device_command_events;
drop policy if exists "broadcast events readable by devices" on public.device_policy_events;
drop policy if exists "study mode events readable by devices" on public.study_mode_events;

revoke all on public.device_command_events from anon, authenticated;
revoke all on public.device_policy_events from anon, authenticated;
revoke all on public.study_mode_events from anon, authenticated;

-- Las políticas por claim del dispositivo se añaden junto con la credencial
-- (devices.device_auth_user_id + auth.uid()). Hasta entonces estas tablas no
-- tienen ninguna política y ningún rol de API las puede leer.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. device_status: fuera la rama family_id IS NULL
-- ─────────────────────────────────────────────────────────────────────────────
-- Esa rama exponía a cualquier usuario autenticado (incluidas location,
-- current_app y apps) de cualquier fila sin familia.
--
-- NO se añade NOT NULL a family_id a propósito: report_device_status acepta
-- reportar antes de emparejar, y en ese camino family_id es legíticamente
-- NULL. Con la rama eliminada esas filas simplemente no las ve nadie, que es el
-- resultado correcto para una fila sin familia.

drop policy if exists "members can read device_status" on public.device_status;

create policy "members can read device_status"
  on public.device_status
  for select
  to authenticated
  using (is_family_member(family_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. achievements: catálogo público de solo lectura
-- ─────────────────────────────────────────────────────────────────────────────
-- No contiene PII ni credenciales (key, title, icon, target_value), así que el
-- SELECT abierto es intencional. Los permisos de escritura sobraban: RLS ya los
-- denegaba por no existir política, pero el grant no debía estar ahí.

revoke insert, update, delete, truncate, references, trigger
  on public.achievements from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. api_throttle: solo el limitador, nunca lectura directa
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS activo sin políticas ya implicaba deny-all para los roles de API, así que
-- los 7 privilegios por tabla eran ruido. throttle() es SECURITY DEFINER y
-- sigue escribiendo; redeem-pair lo invoca con la anon key.

revoke all on public.api_throttle from anon, authenticated;

-- children: se aplica en la misma pasada al revisar la superficie. La politica
-- "members can read children" es to authenticated, asi que anon ya veia 0 filas
-- por RLS; los 7 privilegios eran ruido con el mismo patron.

revoke all on public.children from anon;
