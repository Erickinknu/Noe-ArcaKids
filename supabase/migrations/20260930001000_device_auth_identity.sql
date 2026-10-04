-- Credencial de dispositivo: identidad Supabase Auth por dispositivo (A2).
--
-- Antecedente: la anon key es pública y las funciones SECURITY DEFINER
-- aceptaban p_device_uuid sin prueba de posesión, de modo que conocer un
-- device_uuid equivalía a estar autenticado. 20260930000000 cortó la
-- enumeración; esto cierra el acceso.
--
-- Modelo: cada dispositivo tiene un auth.users propio. redeem-pair lo crea
-- con service_role y devuelve una contraseña de un solo uso; el child app hace
-- signInWithPassword y recibe un JWT real de GoTrue. RLS resuelve el
-- dispositivo con auth.uid() contra devices.device_auth_user_id, sin depender
-- de profiles (un dispositivo no es un miembro de la familia).
--
-- El par (email, contraseña) del dispositivo no es un secreto del usuario: es
-- una credencial de la máquina. Aun así se trata como tal:
--   · el email es sintético y no entregable, para que no llegue a un buzón real
--   · la contraseña se genera con aleatoriedad criptográfica y se devuelve
--     una sola vez, en la respuesta del emparejamiento
--   · device_credentials se lee con service_role desde la edge function, nunca
--     desde un cliente de API

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas de identidad y revocación en devices
-- ─────────────────────────────────────────────────────────────────────────────
-- device_auth_user_id: auth.users.id del dispositivo. Es la columna que RLS
--   resuelve en cada petición.
-- device_revoked_at: revocación explícita. Un dispositivo desvinculado conserva
--   la fila (historial de actividad) pero pierde el acceso.
-- device_unlinked_at: baja limpia. Solo lo escribe unlink_device().

alter table public.devices
  add column if not exists device_auth_user_id uuid unique
    references auth.users(id) on delete set null,
  add column if not exists device_revoked_at timestamptz,
  add column if not exists device_unlinked_at timestamptz;

create unique index if not exists devices_device_auth_user_id_idx
  on public.devices (device_auth_user_id)
  where device_auth_user_id is not null;

comment on column public.devices.device_auth_user_id is
  'auth.users.id de la identidad del dispositivo. RLS lo resuelve contra auth.uid().';
comment on column public.devices.device_revoked_at is
  'Marcado al revocar el acceso sin desvincular. NULL = acceso vigente.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Estado de la credencial, separado de devices
-- ─────────────────────────────────────────────────────────────────────────────
-- Se separa de devices a propósito: el hash de la credencial del dispositivo no
-- pertenece al modelo de datos familiar, y mantenerlo aparte evita que un
-- SELECT accidental sobre devices lo exponga. authenticated no recibe ningún
-- privilegio sobre esta tabla.

create table if not exists public.device_credentials (
  device_uuid      uuid primary key references public.devices(device_uuid) on delete cascade,
  auth_user_id     uuid not null unique references auth.users(id) on delete cascade,
  email            text not null unique,
  password_hash    text not null,
  last_used_at     timestamptz,
  rotated_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists device_credentials_auth_user_id_idx
  on public.device_credentials (auth_user_id);

alter table public.device_credentials enable row level security;

-- Sin políticas a propósito: el acceso es exclusivo de service_role, que
-- ignora RLS. Si algún día se abriera a authenticated, la política faltante
-- haría fallar en vez de filtrar.

revoke all on public.device_credentials from anon, authenticated;

comment on table public.device_credentials is
  'Credencial de dispositivo. Solo service_role. No exponer por API.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Helper de resolución: ¿esta petición viene de este dispositivo?
-- ─────────────────────────────────────────────────────────────────────────────
-- Se cachea como STABLE porque auth.uid() no cambia dentro de una transacción
-- y el planificador lo reutiliza dentro de la misma consulta, en lugar de
-- repetir la búsqueda por fila evaluada.

create or replace function public.current_device_uuid()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.device_uuid
  from public.devices d
  where d.device_auth_user_id = auth.uid()
    and d.device_revoked_at is null
    and d.device_unlinked_at is null
  limit 1
$$;

comment on function public.current_device_uuid() is
  'device_uuid de la identidad de la petición, o NULL si no es un dispositivo válido.';

-- SECURITY DEFINER para poder leer devices, que no tiene SELECT para el rol del
-- dispositivo. Solo se expone al rol autenticado; anon no la usa.

revoke all on function public.current_device_uuid() from public, anon;
grant execute on function public.current_device_uuid() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS de las tres tablas Tier 1, por identidad de dispositivo
-- ─────────────────────────────────────────────────────────────────────────────
-- Sustituye a las políticas using(true) que 20260930000000 eliminó. La
-- comparación es contra current_device_uuid(), no contra un parámetro: así el
-- cliente no puede nombrar otro dispositivo.
--
-- El cast a text es por una inconsistencia previa del esquema, no por gusto:
-- device_command_events y device_policy_events guardan device_uuid como text,
-- mientras study_mode_events y devices lo guardan como uuid. Se compara contra
-- el texto en vez de castear la columna porque castear la columna lanzaría
-- error ante cualquier fila mal formada, y un fallo de esa lectura podría
-- tumbar la sincronización del dispositivo.

create policy "device reads its own command events"
  on public.device_command_events
  for select
  to authenticated
  using (device_uuid = public.current_device_uuid()::text);

create policy "device reads its own policy events"
  on public.device_policy_events
  for select
  to authenticated
  using (device_uuid = public.current_device_uuid()::text);

create policy "device reads its own study mode events"
  on public.study_mode_events
  for select
  to authenticated
  using (device_uuid = public.current_device_uuid());

grant select on public.device_command_events to authenticated;
grant select on public.device_policy_events to authenticated;
grant select on public.study_mode_events to authenticated;

-- Las escrituras siguen siendo de service_role a través de los triggers
-- broadcast_*, que son SECURITY DEFINER. El dispositivo solo lee.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Vincular / desvincular
-- ─────────────────────────────────────────────────────────────────────────────

-- Emparejamiento completado. Vincula la identidad recién creada al dispositivo
-- y devuelve el par de credenciales para el one-time password.
-- SECURITY DEFINER y called por service_role desde redeem-pair.

create or replace function public.link_device_identity(
  p_device_uuid       uuid,
  p_auth_user_id      uuid,
  p_email             text,
  p_password_hash     text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.devices
     set device_auth_user_id = p_auth_user_id,
         device_revoked_at    = null,
         device_unlinked_at   = null,
         updated_at           = now()
   where device_uuid = p_device_uuid;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  insert into public.device_credentials
    (device_uuid, auth_user_id, email, password_hash)
  values
    (p_device_uuid, p_auth_user_id, p_email, p_password_hash)
  on conflict (device_uuid) do update
    set auth_user_id  = excluded.auth_user_id,
        email         = excluded.email,
        password_hash = excluded.password_hash,
        rotated_at    = now(),
        updated_at    = now();
end;
$$;

revoke all on function public.link_device_identity(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.link_device_identity(uuid, uuid, text, text)
  to service_role;

-- Desvinculación. Solo un padre de la familia. Deja de existir la identidad del
-- dispositivo: revoca el acceso, marca la baja y borra la credencial. El
-- historial de la fila devices se conserva para el historial de actividad.

create or replace function public.unlink_device(p_device_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_auth_user_id uuid;
begin
  select * into v_device
    from public.devices
   where device_uuid = p_device_uuid
   for update;

  if not found then
    raise exception 'DEVICE_NOT_FOUND';
  end if;

  if not public.is_family_parent(v_device.family_id) then
    raise exception 'NOT_FAMILY_PARENT';
  end if;

  v_auth_user_id := v_device.device_auth_user_id;

  update public.devices
     set device_auth_user_id = null,
         device_revoked_at    = now(),
         device_unlinked_at   = now(),
         updated_at           = now()
   where device_uuid = p_device_uuid;

  delete from public.device_credentials where device_uuid = p_device_uuid;

  -- El lado de GoTrue lo borra redeem-pair con service_role; aquí se le devuelve
  -- el id para que pueda eliminar el auth.users y revocar sus refresh tokens.
  return jsonb_build_object('auth_user_id', v_auth_user_id, 'device_uuid', p_device_uuid);
end;
$$;

revoke all on function public.unlink_device(uuid) from public, anon;
grant execute on function public.unlink_device(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Reconciliación: revocar todo acceso de dispositivo de una familia
-- ─────────────────────────────────────────────────────────────────────────────
-- Requisito operativo del piloto: cuando un padre desvincula un hijo, los
-- dispositivos de ese hijo pierden acceso aunque la app siga instalada.

create or replace function public.revoke_child_devices(p_child_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_row record;
begin
  select c.family_id into v_family_id
    from public.children c
   where c.id = p_child_id;

  if v_family_id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;

  if not public.is_family_parent(v_family_id) then
    raise exception 'NOT_FAMILY_PARENT';
  end if;

  for v_row in
    update public.devices
       set device_revoked_at = now(),
           updated_at        = now()
     where child_id = p_child_id
       and device_revoked_at is null
     returning device_auth_user_id
  loop
    return next v_row.device_auth_user_id;
  end loop;
end;
$$;

revoke all on function public.revoke_child_devices(uuid) from public, anon;
grant execute on function public.revoke_child_devices(uuid) to authenticated;
