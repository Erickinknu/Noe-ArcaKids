-- Telemetría mínima de producto (spec §11).
-- Tabla de solo-inserción: los clientes NO pueden leerla; el análisis se hace
-- con service_role (dashboard / consultas SQL). Sin datos personales: solo un
-- nombre de evento y un objeto `props` acotado.
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  family_id uuid,
  app text not null default 'noe',
  event text not null,
  props jsonb not null default '{}'::jsonb,
  platform text,
  app_version text,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Permisos mínimos: solo INSERT para anon/authenticated (sin SELECT).
grant insert on public.analytics_events to anon, authenticated;

-- Usuarios autenticados: solo pueden insertar eventos a su propio nombre.
drop policy if exists analytics_events_insert_own on public.analytics_events;
create policy analytics_events_insert_own on public.analytics_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Anónimos (antes del alta / onboarding): solo eventos sin usuario.
drop policy if exists analytics_events_insert_anon on public.analytics_events;
create policy analytics_events_insert_anon on public.analytics_events
  for insert
  to anon
  with check (user_id is null);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_idx
  on public.analytics_events (event, created_at desc);
create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id, created_at desc);

comment on table public.analytics_events is
  'Eventos de producto (telemetría). Solo inserción; lectura con service_role.';
