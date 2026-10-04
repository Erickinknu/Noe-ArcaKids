-- 20260930003000_enforce_device_claim_on_sql_rpcs.sql
--
-- Guard de autorización para los RPC de dispositivo (parte 2 de 2: sql).
--
-- Las 16 funciones de 20260930002000 se resolvieron inyectando una sentencia
-- en el cuerpo. Las 3 de aqui son LANGUAGE sql, donde no existe seccion
-- ejecutable: no hay donde intercalar un perform. Por eso el guard se evalua en
-- el FROM como un cross join contra assert_device_claim, que es una funcion que
-- lanza. Si el claim no es valido, la excepcion aborta la sentencia entera; si
-- es valido, contribute una sola fila y no altera el resultado.
--
-- Se mantiene el estilo sql en vez de convertirlas a plpgsql: el guard queda
-- visible en la lectura de la funcion, que es justo lo que se revisa en un
-- PR de seguridad.

-- Devuelve hasta 50 comandos pendientes del propio dispositivo. Era la via
-- para que cualquiera con un device_uuid ajeno obtuviera los comandos de otro
-- dispositivo.
create or replace function public.get_device_commands_for_device(p_device_uuid text)
 RETURNS TABLE(id uuid, device_uuid text, family_id uuid, child_id uuid, command text, payload jsonb, status text, created_at timestamp with time zone, executed_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select dc.id, dc.device_uuid, dc.family_id, dc.child_id, dc.command, dc.payload, dc.status, dc.created_at, dc.executed_at
  from public.device_commands dc
  cross join public.assert_device_claim(p_device_uuid::uuid)
  where dc.device_uuid = p_device_uuid
    and dc.status = 'pending'
  order by dc.created_at asc
  limit 50;
$function$;

-- Devuelve el salt y el hash del PIN familiar. Conocer el device_uuid bastaba
-- para leerlos, lo que expone el material que protege el PIN. Ahora solo el
-- propio dispositivo lo obtiene.
create or replace function public.get_family_device_pin(p_device_uuid uuid)
 RETURNS TABLE(salt text, pin_hash text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select d.pin_salt, d.pin_hash
  from public.devices d
  cross join public.assert_device_claim(p_device_uuid)
  where d.device_uuid = p_device_uuid
$function$;

create or replace function public.get_family_mode(p_device_uuid uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select f.mode
  from public.devices d
  join public.families f on f.id = d.family_id
  cross join public.assert_device_claim(p_device_uuid)
  where d.device_uuid = p_device_uuid
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants
-- ─────────────────────────────────────────────────────────────────────────────

-- Los 19 RPC de dispositivo salen del conjunto de ejecutables de anon y de
-- public (todo rol lo hereda por defecto). El grant a authenticated se escribe
-- de forma explicita en lugar de confiar en el que dejaron las migraciones
-- originales: revocar de public no borra un grant directo, asi que en una base
-- ya migrada el permiso sobrevive por casualidad historica, y en una base
-- limpia dependeria de que ese grant existiera.
--
-- revoke_pairing_code queda fuera de esta lista a proposito: es el ancla de
-- confianza del emparejamiento, lo invoca el child antes de tener identidad, y
-- su proteccion es el codigo de un solo uso mas el limitador de throttle.

do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'ack_device_command',
    'check_geofences_for_device',
    'dismiss_device_alert_for_device',
    'get_app_categories_for_device',
    'get_child_achievements_for_device',
    'get_child_rules_for_device',
    'get_device_commands_for_device',
    'get_device_state_for_device',
    'get_family_device_pin',
    'get_family_mode',
    'get_study_mode_schedule_for_device',
    'get_web_filter_rules_for_device',
    'increment_achievement_for_device',
    'record_geofence_event_for_device',
    'report_device_apps',
    'report_device_status',
    'report_usage_for_device',
    'report_web_visit',
    'update_device_location_for_device'
  ] loop
    execute format('revoke execute on function public.%I from public, anon', v_fn);
    execute format('grant  execute on function public.%I to authenticated', v_fn);
  end loop;
end;
$$;
