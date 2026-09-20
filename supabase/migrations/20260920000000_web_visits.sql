-- Parte B1: Historial de sitios visitados (Internet Seguro).
-- ARCA KIDS (a través de su VPN de filtrado) reporta cada dominio visitado;
-- NOE lo consume por hijo: hosts, cuándo y si fue bloqueado por filtrado web.
--
-- Modelo: web_visits cuelga del dispositivo (igual que usage_reports); el
-- acceso anónimo se valida por device_uuid (auto-reporte) y el acceso de
-- lectura para padres se resuelve por familia (device -> child -> family).
--
-- Seguridad: RLS con policy de lectura solo para padres de la familia; la
-- escritura (insert) es exclusiva de los RPC SECURITY DEFINER (revoke general).

create table if not exists public.web_visits (
  id uuid primary key default gen_random_uuid(),
  device_uuid uuid not null references public.devices(device_uuid) on delete cascade,
  hostname text not null,
  blocked boolean not null default false,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists web_visits_device_visited_idx
  on public.web_visits (device_uuid, visited_at desc);

alter table public.web_visits enable row level security;

create policy "parents can read family web visits" on public.web_visits
  for select to authenticated
  using (
    exists (
      select 1
      from public.devices d
      join public.children c on c.id = d.child_id
      where d.device_uuid = web_visits.device_uuid
        and public.is_family_parent(c.family_id)
    )
  );

revoke all on table public.web_visits from public, anon;

-- ARCA KIDS reports a visited site (self-report, keyed by own device_uuid) -----
create or replace function public.report_web_visit(
  p_device_uuid uuid,
  p_hostname text,
  p_blocked boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_hostname is null or length(trim(p_hostname)) = 0 then
    raise exception 'invalid hostname';
  end if;

  insert into public.web_visits (device_uuid, hostname, blocked, visited_at)
  values (
    p_device_uuid,
    lower(trim(p_hostname)),
    coalesce(p_blocked, false),
    now()
  );
end;
$$;

revoke execute on function public.report_web_visit(uuid, text, boolean) from public, anon;
grant execute on function public.report_web_visit(uuid, text, boolean) to anon, authenticated;

-- NOE: recent web visits for a child (parents only) ----------------------------
create or replace function public.get_child_web_visits(
  p_child_id uuid,
  p_days integer default 7
)
returns table (
  hostname text,
  blocked boolean,
  visited_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select v.hostname, v.blocked, v.visited_at
  from public.web_visits v
  join public.children c on c.id = p_child_id
  where public.is_family_parent(c.family_id)
    and v.device_uuid in (
      select d.device_uuid
      from public.devices d
      where d.child_id = p_child_id
    )
    and v.visited_at >= now() - make_interval(days => greatest(1, least(p_days, 30)))
  order by v.visited_at desc
  limit 500;
$$;

revoke execute on function public.get_child_web_visits(uuid, integer) from public, anon;
grant execute on function public.get_child_web_visits(uuid, integer) to authenticated;