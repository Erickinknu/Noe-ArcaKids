-- Fase 6 (seguimiento): revocar EXECUTE de funciones trigger-only expuestas a anon.
--
-- Causa raíz: en el schema public hay ALTER DEFAULT PRIVILEGES que otorgan EXECUTE
-- DIRECTAMENTE a anon/authenticated/service_role (no vía PUBLIC). Por eso
-- "REVOKE ... FROM public" NO elimina el acceso de anon.
-- Las funciones trigger-only no necesitan EXECUTE para dispararse: revocarlas es
-- seguro y NO afecta a redeem_pairing_code ni throttle (que se conservan para anon).
-- Idempotente y no destructivo: no borra tablas ni columnas.

do $$
declare
  fn  text;
  fns text[] := array[
    'public.enforce_child_limit()',
    'public.prune_study_mode_events()',
    'public.broadcast_device_policy()',
    'public.broadcast_study_mode()',
    'public.set_updated_at()',
    'public.update_plans_updated_at()'
  ];
begin
  foreach fn in array fns loop
    begin
      execute format('revoke execute on function %s from public, anon, authenticated', fn);
    exception
      when undefined_function then null;
      when undefined_object   then null;
    end;
  end loop;
end
$$;

-- Defensa en profundidad: RLS activo, sin grants de tabla para roles de API.
-- (throttle/redeem_pairing_code son SECURITY DEFINER y corren como owner:
--  no dependen de estos grants. La edge function usa service_role.)
do $$
begin
  begin
    execute 'alter table public.api_throttle enable row level security';
  exception when undefined_table then null; end;
  begin
    execute 'alter table public.device_credentials enable row level security';
  exception when undefined_table then null; end;
  begin
    execute 'revoke all on public.api_throttle from public, anon, authenticated';
  exception when undefined_table then null; end;
  begin
    execute 'revoke all on public.device_credentials from public, anon, authenticated';
  exception when undefined_table then null; end;
end
$$;
