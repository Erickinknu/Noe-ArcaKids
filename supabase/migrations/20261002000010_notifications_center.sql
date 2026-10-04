-- Fase 3: centro de notificaciones real.
-- Tabla + RPCs + triggers desde unlock_requests, geofence_events y SOS de devices.
-- La entrega push (Edge Function) es un paso posterior y no depende de este esquema.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.children(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('unlock_request', 'geofence', 'sos', 'offline', 'time_goal', 'system')),
  title text not null,
  body text not null default '',
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_family_created_idx
  on public.notifications (family_id, created_at desc);
create index if not exists notifications_family_unread_idx
  on public.notifications (family_id) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Parents read family notifications" on public.notifications;
create policy "Parents read family notifications"
  on public.notifications for select
  using (public.is_family_parent(family_id));

-- Lectura solo para padres; las mutaciones pasan por RPCs definer.
revoke all on public.notifications from anon;
grant select on public.notifications to authenticated;

-- Inserter interno usado por triggers y por create_notification.
-- No es ejecutable por los roles de la app.
create or replace function public.notifications_insert(
  p_family_id uuid,
  p_child_id uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_data jsonb default '{}'::jsonb,
  p_user_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_family_id is null then
    return null;
  end if;
  insert into public.notifications (family_id, child_id, user_id, type, title, body, data)
  values (p_family_id, p_child_id, p_user_id, p_type, p_title, coalesce(p_body, ''), coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.notifications_insert(uuid, uuid, text, text, text, jsonb, uuid)
  from public, anon, authenticated;

-- Creador expuesto a la app: solo un padre de la familia.
create or replace function public.create_notification(
  p_family_id uuid,
  p_child_id uuid default null,
  p_type text default 'system',
  p_title text default '',
  p_body text default '',
  p_data jsonb default '{}'::jsonb,
  p_user_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_family_parent(p_family_id) then
    raise exception 'not a family parent';
  end if;
  return public.notifications_insert(p_family_id, p_child_id, p_type, p_title, p_body, p_data, p_user_id);
end;
$$;

revoke all on function public.create_notification(uuid, uuid, text, text, text, jsonb, uuid)
  from public, anon;
grant execute on function public.create_notification(uuid, uuid, text, text, text, jsonb, uuid)
  to authenticated;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
     set is_read = true
   where id = p_id
     and public.is_family_parent(family_id);
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications n
     set is_read = true
   where n.is_read = false
     and n.family_id in (select p.family_id from public.profiles p where p.user_id = auth.uid());
$$;

revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_all_notifications_read() to authenticated;

create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
    from public.notifications n
   where n.is_read = false
     and n.family_id in (select p.family_id from public.profiles p where p.user_id = auth.uid());
$$;

revoke all on function public.get_unread_notification_count() from public, anon;
grant execute on function public.get_unread_notification_count() to authenticated;

-- ── Triggers ────────────────────────────────────────────────────────────────

create or replace function public.notify_unlock_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notifications_insert(
    new.family_id,
    new.child_id,
    'unlock_request',
    'Solicitud de desbloqueo',
    coalesce(nullif(new.reason, ''), 'Tu hijo pide desbloquear el dispositivo'),
    jsonb_build_object('unlockRequestId', new.id, 'status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_unlock_request on public.unlock_requests;
create trigger trg_notify_unlock_request
  after insert on public.unlock_requests
  for each row execute function public.notify_unlock_request();

create or replace function public.notify_geofence_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_zone text := coalesce(nullif(new.geofence_name, ''), 'una zona');
begin
  perform public.notifications_insert(
    new.family_id,
    new.child_id,
    'geofence',
    case when new.event_type = 'enter' then 'Entró a ' || v_zone else 'Salió de ' || v_zone end,
    case when new.event_type = 'enter' then 'Tu hijo llegó a ' || v_zone else 'Tu hijo salió de ' || v_zone end,
    jsonb_build_object('geofenceId', new.geofence_id, 'eventType', new.event_type, 'deviceUuid', new.device_uuid)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_geofence_event on public.geofence_events;
create trigger trg_notify_geofence_event
  after insert on public.geofence_events
  for each row execute function public.notify_geofence_event();

create or replace function public.notify_device_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.alert_active and coalesce(old.alert_active, false) = false then
    perform public.notifications_insert(
      new.family_id,
      new.child_id,
      'sos',
      'Alerta SOS',
      coalesce(nullif(new.name, ''), 'Un dispositivo') || ' activó la alerta SOS',
      jsonb_build_object('deviceId', new.id, 'deviceUuid', new.device_uuid)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_device_alert on public.devices;
create trigger trg_notify_device_alert
  after update on public.devices
  for each row execute function public.notify_device_alert();
