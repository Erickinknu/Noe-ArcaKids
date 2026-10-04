-- Endurecer el guard de los tres RPC que se escribieron en SQL.
--
-- Por que:
--
--   El guard se habia implementado como
--
--     from <tabla> cross join public.assert_device_claim(p_device_uuid)
--
--   Un CROSS JOIN es un INNER JOIN. En un inner join anidado, si el lado
--   exterior no produce filas, PostgreSQL nunca examina el lado interior, y
--   por tanto la funcion del guard no llega a ejecutarse nunca.
--
--   Comprobado en produccion: get_device_commands_for_device devolvia '[]' a un
--   token de otro dispositivo cuando ese dispositivo no tenia comandos
--   pendientes, y devolvia DEVICE_CLAIM_MISMATCH en cuanto se le inserto
--   uno. Es decir, el control se comportaba de forma distinta segun los datos:
--   fail-open en vez de fail-closed.
--
--   El mismo patron afecta a get_family_mode y get_family_device_pin cuando
--   el device_uuid no existe: devuelven NULL o vacio en lugar de denegar, lo
--   que además permite a un token distinguir 'no existe' de 'no permitido'.
--
-- La correccion es pasar los tres a plpgsql y ejecutar el guard con un
-- PERFORM como primera sentencia del cuerpo. En plpgsql el PERFORM se ejecuta
-- siempre, antes de tocar ninguna tabla, con independencia de los datos.

-- ─────────────────────────────────────────────────────────────────────────────
-- get_device_commands_for_device
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_device_commands_for_device(p_device_uuid text)
returns table(
  id          uuid,
  device_uuid text,
  family_id   uuid,
  child_id    uuid,
  command     text,
  payload     jsonb,
  status      text,
  created_at  timestamptz,
  executed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_device_claim_text(p_device_uuid);

  return query
    select dc.id, dc.device_uuid, dc.family_id, dc.child_id, dc.command,
           dc.payload, dc.status, dc.created_at, dc.executed_at
      from public.device_commands dc
     where dc.device_uuid = p_device_uuid
       and dc.status = 'pending'
     order by dc.created_at asc
     limit 50;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_family_mode
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_family_mode(p_device_uuid uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_device_claim(p_device_uuid);

  return (
    select f.mode
      from public.devices d
      join public.families f on f.id = d.family_id
     where d.device_uuid = p_device_uuid
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- get_family_device_pin
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_family_device_pin(p_device_uuid uuid)
returns table(
  salt     text,
  pin_hash text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_device_claim(p_device_uuid);

  return query
    select d.pin_salt, d.pin_hash
      from public.devices d
     where d.device_uuid = p_device_uuid;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Permisos: los tres pasan a ser plpgsql, asi que las firmas no cambian y los
-- GRANT/REVOKE de 20260930003000 siguen validos. Se repiten de forma explicita
-- para que este archivo sea autosuficiente.
-- ─────────────────────────────────────────────────────────────────────────────
revoke all on function public.get_device_commands_for_device(text) from public, anon;
revoke all on function public.get_family_mode(uuid)                     from public, anon;
revoke all on function public.get_family_device_pin(uuid)                from public, anon;

grant execute on function public.get_device_commands_for_device(text) to authenticated, service_role;
grant execute on function public.get_family_mode(uuid)                     to authenticated, service_role;
grant execute on function public.get_family_device_pin(uuid)                to authenticated, service_role;
