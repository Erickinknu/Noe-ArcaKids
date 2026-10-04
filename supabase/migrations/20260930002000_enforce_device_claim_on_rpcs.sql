-- 20260930002000_enforce_device_claim_on_rpcs.sql
--
-- Guard de autorización para los RPC de dispositivo (parte 1 de 2: plpgsql).
--
-- CONTEXTO: 16 RPC son SECURITY DEFINER y tomaban p_device_uuid como prueba de
-- identidad. El child app distribuye la anon key --que es publica--, asi que
-- cualquier app que conociera el device_uuid, un valor fijo dentro del APK,
-- podia leer y escribir los datos de CUALQUIER dispositivo, incluido el material
-- del PIN familiar.
--
-- En vez de reescribir a mano los 16 cuerpos, se inyecta una unica sentencia
-- justo despues del BEGIN. Asi el guard queda antes de cualquier SELECT, UPDATE
-- o RETURN, y no depende de que alguien recuerde invocarlo al anadir una linea
-- nueva a una funcion.
--
-- POR QUE UN GUARD UNIFORME Y NO UNO POR FUNCION: el esquema es historico y
-- p_device_uuid es text en unas funciones y uuid en otras. El texto del cuerpo
-- se genera con pg_get_functiondef y se le inserta la MISMA sentencia en los
-- 16 casos; unicamente varian los parametros. Asi el control no depende de leer
-- el tipo del parametro desde el catalogo, que es donde estos intentos se
-- suelen romper: en funciones RETURNS TABLE, proargnames incluye las columnas
-- OUT pero proargtypes solo las IN, y los subindices no se alinean.
--
-- IDEMPOTENCIA: el bloque quita cualquier assert_device_claim previo antes de
-- insertar el canonico. Aplicar la migracion dos veces, o aplicarla sobre una
-- base donde el guard ya existia escrito de otra forma, produce el mismo
-- resultado: exactamente una llamada al guard, siempre la misma.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. La primitiva de autorización
-- ─────────────────────────────────────────────────────────────────────────────

-- Compara el dispositivo solicitado con el del JWT. STABLE SECURITY DEFINER
-- porque consulta devices pasando por RLS, que un dispositivo no puede
-- satisfacer por si mismo.
create or replace function public.assert_device_claim(p_device_uuid uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_caller_device uuid;
begin
  v_caller_device := public.current_device_uuid();

  if v_caller_device is null then
    raise exception 'DEVICE_CLAIM_REQUIRED'
      using errcode = '42501',
            hint = 'La peticion debe traer el JWT del dispositivo (auth.uid()).';
  end if;

  if p_device_uuid is null or v_caller_device <> p_device_uuid then
    raise exception 'DEVICE_CLAIM_MISMATCH'
      using errcode = '42501',
            hint = 'El token pertenece a otro dispositivo.';
  end if;
end;
$$;

revoke all on function public.assert_device_claim(uuid) from public, anon;
grant  execute on function public.assert_device_claim(uuid) to authenticated, service_role;

-- Entrada unica para el guard inyectado. Existe para que la sentencia
-- inyectada sea identica en las 16 funciones: castear a text siempre es valido,
-- tanto si el parametro ya era text como si era uuid.
--
-- La conversion se hace aqui y no en el cuerpo de la funcion para que un
-- device_uuid malformado produzca DEVICE_CLAIM_MISMATCH, un error de
-- autorizacion, y no un error de sintaxis de PostgreSQL que delate la
-- estructura interna.
create or replace function public.assert_device_claim_text(p_device_uuid text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_device_uuid is null or p_device_uuid !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'DEVICE_CLAIM_MISMATCH'
      using errcode = '42501',
            hint = 'El token pertenece a otro dispositivo.';
  end if;

  perform public.assert_device_claim(p_device_uuid::uuid);
end;
$$;

revoke all on function public.assert_device_claim_text(text) from public, anon;
grant  execute on function public.assert_device_claim_text(text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Inyección del guard en las 16 funciones plpgsql
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_functions text[] := array[
    'ack_device_command',
    'check_geofences_for_device',
    'dismiss_device_alert_for_device',
    'get_app_categories_for_device',
    'get_child_achievements_for_device',
    'get_child_rules_for_device',
    'get_device_state_for_device',
    'get_study_mode_schedule_for_device',
    'get_web_filter_rules_for_device',
    'increment_achievement_for_device',
    'record_geofence_event_for_device',
    'report_device_apps',
    'report_device_status',
    'report_usage_for_device',
    'report_web_visit',
    'update_device_location_for_device'
  ];
  v_fn   text;
  v_oid  oid;
  v_def  text;
  v_tail text;
  v_pos  int;
  v_new  text;
begin
  foreach v_fn in array v_functions loop
    select p.oid into v_oid
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_language  l on l.oid = p.prolang
     where n.nspname = 'public'
       and p.proname = v_fn
       and l.lanname = 'plpgsql';

    if v_oid is null then
      raise exception 'RPC_PLPGSQL_NO_ENCONTRADA: %', v_fn;
    end if;

    -- Normalizar: quitar cualquier guard previo, en cualquiera de sus formas.
    v_def := regexp_replace(
      pg_get_functiondef(v_oid),
      'perform[ \t\r\n]+public\.assert_device_claim[a-z_]*[ \t\r\n]*\([^;]*\);',
      '',
      'gi'
    );

    if v_def ilike '%assert_device_claim%' then
      raise exception 'RPC_GUARD_RESIDUAL: %', v_fn;
    end if;

    -- El cuerpo empieza tras el delimitador AS. Buscar 'begin' desde el inicio
    -- del archivo lo encuentra en la propia firma y en comentarios.
    v_pos := regexp_instr(v_def, 'as \$function\$|as \$\$', 1, 1, 0, 'i');
    if v_pos = 0 then
      raise exception 'RPC_SIN_DELIMITADOR_AS: %', v_fn;
    end if;

    v_tail := substr(v_def, v_pos);

    -- Se ancla en un salto de linea explicito, no en ^: el ancla de inicio de
    -- linea depende de flags de regexp que han cambiado entre versiones, y aqui
    -- un fallo silencioso significaria insertar el guard en el sitio
    -- equivocado de una funcion de seguridad.
    v_pos := regexp_instr(v_tail, E'\\n[ \\t]*begin', 1, 1, 0, 'i');
    if v_pos = 0 then
      raise exception 'RPC_SIN_BEGIN_EN_CUERPO: %', v_fn;
    end if;

    -- Sustituir la palabra BEGIN conservando su indentacion, de modo que el
    -- guard queda dentro del bloque y con la misma forma que el resto del cuerpo.
    -- Se sustituye sobre v_def completo y no sobre v_tail para no tener que
    -- rebasear el indice encontrado en el segmento.
    --
    -- Dos detalles que no son obvios y que fallan en silencio:
    --   - El limite de palabra es \y y no \b: en las ARE de PostgreSQL \b no es
    --     un limite de palabra, y con \b la expresion no casa nunca.
    --   - El salto de linea del replacement va como chr(10), no como \n: la
    --     cadena de reemplazo de regexp_replace NO es una expresion regular, asi
    --     que \n ahi no es un salto de linea sino la letra n precedida de
    --     backslash. Con \n el guard se insertaba como texto literal y la funcion
    --     quedaba sin compilar.
    v_new := regexp_replace(
      v_def,
      E'\\n([ \\t]*)begin\\y',
      E'\\1begin' || chr(10) || '  perform public.assert_device_claim_text(p_device_uuid::text);',
      'i'
    );

    if v_new not like '%assert_device_claim_text%' then
      raise exception 'RPC_GUARD_NO_INSERTADO: %', v_fn;
    end if;

    execute v_new;
  end loop;
end;
$$;
