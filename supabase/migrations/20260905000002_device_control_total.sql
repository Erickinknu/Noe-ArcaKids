-- FASE 11: Control total del dispositivo (v1.2.0)
-- 1) Extiende el catálogo de comandos remotos (LOCK_TASK, SCREEN_CAPTURE, CAMERA,
--    HIDE_APPS, UNHIDE_APPS, UNINSTALL_LOCK, FORCE_STOP, WIPE_DEVICE, LIST_APPS).
-- 2) Crea device_command_events: tabla broadcast para Realtime (trigger sobre
--    device_commands). La fuente device_commands conserva RLS cerrada a anon;
--    la broadcast es grant-only (SELECT a anon) porque postgres_changes entrega
--    cambios según los privilegios del suscriptor (mismo modelo de confianza que
--    los RPC scoped por device_uuid del niño).
-- 3) device_status.apps: la lista de apps instaladas que el dispositivo reporta
--    tras LIST_APPS.
-- 4) report_device_apps: RPC anon scoped por device_uuid (patrón ack/report).

-- ── 1) Catálogo de comandos ──
alter table public.device_commands drop constraint if exists device_commands_command_check;
alter table public.device_commands add constraint device_commands_command_check check (
  command in (
    'LOCK','UNLOCK','BLOCK_APPS','UNBLOCK_APPS','SET_POLICY','REQUEST_LOCATION',
    'LOCK_TASK','UNLOCK_TASK','SCREEN_CAPTURE','CAMERA',
    'HIDE_APPS','UNHIDE_APPS','UNINSTALL_LOCK','FORCE_STOP','WIPE_DEVICE','LIST_APPS'
  )
);

-- ── 2) Tabla broadcast para Realtime ──
create table if not exists public.device_command_events (
  id uuid primary key,
  device_uuid text not null,
  family_id uuid,
  command text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists device_command_events_device_uuid_idx
  on public.device_command_events (device_uuid, created_at desc);

-- Sin RLS a propósito (tabla de broadcast): el acceso realtime se limita por el
-- filtro device_uuid del suscriptor. Solo lectura para anon/authenticated.
grant select on public.device_command_events to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.device_command_events;
exception when duplicate_object then null; end $$;

-- ── 3) Trigger: copia cada comando en la tabla broadcast ──
create or replace function public.broadcast_device_command()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.device_command_events (id, device_uuid, family_id, command, payload, created_at)
  values (new.id, new.device_uuid, new.family_id, new.command, new.payload, new.created_at);
  return new;
end;
$$;

drop trigger if exists trg_broadcast_device_command on public.device_commands;
create trigger trg_broadcast_device_command
  after insert on public.device_commands
  for each row execute function public.broadcast_device_command();

-- ── 4) Lista de apps instaladas en device_status ──
alter table public.device_status add column if not exists apps jsonb;

create or replace function public.report_device_apps(p_device_uuid text, p_apps jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
  v_family_id uuid;
  v_child_id uuid;
begin
  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;

  select coalesce(ds.family_id, v_device.family_id), coalesce(ds.child_id, v_device.child_id)
  into v_family_id, v_child_id
  from public.device_status ds
  where ds.device_uuid = p_device_uuid
  limit 1;

  insert into public.device_status (device_uuid, family_id, child_id, apps, last_seen)
  values (p_device_uuid, v_family_id, v_child_id, p_apps, now())
  on conflict (device_uuid) do update
    set family_id = coalesce(excluded.family_id, public.device_status.family_id),
        child_id = coalesce(excluded.child_id, public.device_status.child_id),
        apps = excluded.apps,
        last_seen = now(),
        updated_at = now();
end;
$$;

revoke execute on function public.report_device_apps(text, jsonb) from public;
grant execute on function public.report_device_apps(text, jsonb) to anon, authenticated;

-- ── 5) enqueue_device_command con el catálogo extendido (conserva la
--       autorización de provisioning de 20260830000000) ──
create or replace function public.enqueue_device_command(
  p_device_uuid text,
  p_command text,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_device public.devices%rowtype;
  v_family_id uuid;
begin
  if p_command not in ('LOCK','UNLOCK','BLOCK_APPS','UNBLOCK_APPS','SET_POLICY','REQUEST_LOCATION',
                       'LOCK_TASK','UNLOCK_TASK','SCREEN_CAPTURE','CAMERA',
                       'HIDE_APPS','UNHIDE_APPS','UNINSTALL_LOCK','FORCE_STOP','WIPE_DEVICE','LIST_APPS') then
    raise exception 'INVALID_COMMAND';
  end if;

  select * into v_device from public.devices where device_uuid = p_device_uuid::uuid;
  if v_device.id is null then
    -- Provisioning flow: resolve family from device_status and authorize.
    select ds.family_id, ds.child_id into v_family_id, v_device.child_id
    from public.device_status ds where ds.device_uuid = p_device_uuid
    limit 1;
    if v_family_id is null or not public.is_family_parent(v_family_id) then
      raise exception 'NOT_AUTHORIZED';
    end if;

    insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
    values (p_device_uuid, v_family_id, v_device.child_id, p_command, p_payload)
    returning id into v_id;

    if v_id is null then
      raise exception 'DEVICE_NOT_FOUND';
    end if;
    return v_id;
  end if;

  if not public.is_family_parent(v_device.family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  insert into public.device_commands (device_uuid, family_id, child_id, command, payload)
  values (p_device_uuid, v_device.family_id, v_device.child_id, p_command, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.enqueue_device_command(text, text, jsonb) from public, anon;
grant execute on function public.enqueue_device_command(text, text, jsonb) to authenticated;