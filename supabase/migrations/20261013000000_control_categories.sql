-- FASE A — Categorías de Control por hijo: Tiempo libre / Siempre / No permitidas.
--
-- Estrategia: extender app_categories (UNIQUE(child_id,package_name) ya
-- garantiza "una app, una sola categoría") + tabla nueva de límites
-- compartidos + RPCs compatibles. 'free' queda como pozo técnico
-- "sin clasificar" (lo que inserta sync_child_apps), no como categoría visible.
-- blocked_apps deja de escribirse desde la UI nueva pero se sigue leyendo
-- (unión) para no romper dispositivos con código anterior.
-- Todo idempotente: re-ejecutable sin cambios.

-- ── 1. Extender valores de category ──────────────────────────────────────────
alter table public.app_categories drop constraint if exists app_categories_category_check;
alter table public.app_categories
  add constraint app_categories_category_check
  check (category in ('free', 'tiempo_libre', 'siempre', 'no_permitida'));

comment on column public.app_categories.category is
  'free=sin clasificar (técnico); tiempo_libre/siempre/no_permitida=categorías de Control.';

-- ── 2. Migrar valores existentes (no-op si ya están migrados) ───────────────
update public.app_categories
set category = 'tiempo_libre', updated_at = now()
where category = 'limited';

update public.app_categories
set category = 'no_permitida', updated_at = now()
where category = 'blocked';

-- ── 3. Fusionar blocked_apps (lo bloqueado gana en conflicto) ───────────────
insert into public.app_categories (family_id, child_id, package_name, app_label, category)
select c.family_id, b.child_id, b.package_name, b.app_label, 'no_permitida'
from public.blocked_apps b
join public.children c on c.id = b.child_id
on conflict (child_id, package_name) do update
  set category = 'no_permitida',
      app_label = excluded.app_label,
      updated_at = now();

-- ── 4. Tabla de límites compartidos por categoría ────────────────────────────
create table if not exists public.app_category_limits (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  child_id uuid not null references public.children (id) on delete cascade,
  category text not null check (category in ('tiempo_libre', 'siempre', 'no_permitida')),
  daily_limit_minutes integer
    check (daily_limit_minutes is null or (daily_limit_minutes >= 0 and daily_limit_minutes <= 1440)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (child_id, category)
);

create index if not exists app_category_limits_family_id_idx
  on public.app_category_limits (family_id);
create index if not exists app_category_limits_child_id_idx
  on public.app_category_limits (child_id);

drop trigger if exists app_category_limits_set_updated_at on public.app_category_limits;
create trigger app_category_limits_set_updated_at
  before update on public.app_category_limits
  for each row execute function public.set_updated_at();

alter table public.app_category_limits enable row level security;

drop policy if exists app_category_limits_read on public.app_category_limits;
create policy app_category_limits_read on public.app_category_limits
  for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists app_category_limits_manage on public.app_category_limits;
create policy app_category_limits_manage on public.app_category_limits
  for all to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

revoke all on public.app_category_limits from public, anon;
grant select, insert, update, delete on public.app_category_limits to authenticated;

comment on table public.app_category_limits is
  'Límite diario compartido por categoría e hijo. NULL = sin límite. Se crea por upsert desde la UI.';

-- ── 5. RPCs de padres: límites por categoría ─────────────────────────────────
create or replace function public.set_category_limit(
  p_child_id uuid,
  p_category text,
  p_daily_limit_minutes integer default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  if p_category not in ('tiempo_libre', 'siempre', 'no_permitida') then
    raise exception 'INVALID_CATEGORY';
  end if;
  if p_daily_limit_minutes is not null
     and (p_daily_limit_minutes < 0 or p_daily_limit_minutes > 1440) then
    raise exception 'INVALID_LIMIT';
  end if;
  select family_id into v_family_id from public.children where id = p_child_id;
  if v_family_id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;
  if not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  insert into public.app_category_limits (family_id, child_id, category, daily_limit_minutes)
  values (v_family_id, p_child_id, p_category, p_daily_limit_minutes)
  on conflict (child_id, category) do update
    set daily_limit_minutes = excluded.daily_limit_minutes,
        updated_at = now();
end;
$$;

revoke execute on function public.set_category_limit(uuid, text, integer) from public, anon;
grant execute on function public.set_category_limit(uuid, text, integer) to authenticated;

create or replace function public.get_category_limits(p_child_id uuid)
returns table (
  category text,
  daily_limit_minutes integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from public.children where id = p_child_id;
  if v_family_id is null then
    raise exception 'CHILD_NOT_FOUND';
  end if;
  if not public.is_family_parent(v_family_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return query
    select l.category, l.daily_limit_minutes
    from public.app_category_limits l
    where l.child_id = p_child_id
    order by l.category;
end;
$$;

revoke execute on function public.get_category_limits(uuid) from public, anon;
grant execute on function public.get_category_limits(uuid) to authenticated;

-- ── 6. RPC dispositivo: unión + columnas aditivas ────────────────────────────
-- Cambio de tipo de retorno (columnas nuevas) => DROP + CREATE.
-- Incluye el guard de identidad EXACTO que inyecta el hardening
-- (assert_device_claim_text primero) y conserva grants vigentes.
drop function if exists public.get_child_rules_for_device(uuid);

create function public.get_child_rules_for_device(p_device_uuid uuid)
returns table (
  child_id uuid,
  display_name text,
  daily_limit_minutes int,
  bedtime_enabled boolean,
  bedtime_start time,
  bedtime_end time,
  blocked_packages text[],
  tiempo_libre_packages text[],
  siempre_packages text[],
  tiempo_libre_limit_minutes int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_device public.devices%rowtype;
begin
  perform public.assert_device_claim_text(p_device_uuid::text);

  select * into v_device
  from public.devices
  where device_uuid = p_device_uuid;

  if v_device.id is null then
    raise exception 'DEVICE_NOT_LINKED';
  end if;

  update public.devices
  set last_seen_at = now()
  where id = v_device.id;

  return query
    select
      c.id,
      c.display_name,
      r.daily_limit_minutes,
      r.bedtime_enabled,
      r.bedtime_start,
      r.bedtime_end,
      coalesce((
        select array_agg(x.package_name order by x.package_name)
        from (
          select b.package_name
          from public.blocked_apps b
          where b.child_id = c.id
          union
          select a.package_name
          from public.app_categories a
          where a.child_id = c.id
            and a.category = 'no_permitida'
        ) x
      ), '{}'::text[]),
      coalesce((
        select array_agg(a.package_name order by a.package_name)
        from public.app_categories a
        where a.child_id = c.id
          and a.category = 'tiempo_libre'
      ), '{}'::text[]),
      coalesce((
        select array_agg(a.package_name order by a.package_name)
        from public.app_categories a
        where a.child_id = c.id
          and a.category = 'siempre'
      ), '{}'::text[]),
      (
        select l.daily_limit_minutes
        from public.app_category_limits l
        where l.child_id = c.id
          and l.category = 'tiempo_libre'
      )
    from public.children c
    left join public.parental_rules r on r.child_id = c.id
    where c.id = v_device.child_id;
end;
$$;

revoke execute on function public.get_child_rules_for_device(uuid) from public, anon;
grant execute on function public.get_child_rules_for_device(uuid) to authenticated;
