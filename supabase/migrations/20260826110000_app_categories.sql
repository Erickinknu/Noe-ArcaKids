-- Per-app categories: limited, blocked, free
create table public.app_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  package_name text not null,
  app_label text not null,
  category text not null default 'free' check (category in ('limited', 'blocked', 'free')),
  time_limit_minutes integer default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id, package_name)
);

alter table public.app_categories enable row level security;

do $$ begin
  create policy "Family members manage app categories"
    on public.app_categories for all
    using (family_id = (select family_id from profiles where user_id = auth.uid()));
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.app_categories to authenticated;

create trigger app_categories_set_updated_at
  before update on public.app_categories
  for each row execute function public.set_updated_at();

create index app_categories_child_id_idx on public.app_categories (child_id);
create index app_categories_family_id_idx on public.app_categories (family_id);

-- RPC: Get app categories for a child
create or replace function public.get_app_categories(p_child_id uuid)
returns table (
  id uuid,
  package_name text,
  app_label text,
  category text,
  time_limit_minutes integer
)
language sql security definer as $$
  select id, package_name, app_label, category, time_limit_minutes
  from public.app_categories
  where child_id = p_child_id
  order by category, app_label;
$$;

-- RPC: Upsert app category
create or replace function public.upsert_app_category(
  p_child_id uuid,
  p_package_name text,
  p_app_label text,
  p_category text,
  p_time_limit_minutes integer default null
)
returns void
language plpgsql security definer as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id from children where id = p_child_id;
  insert into app_categories (family_id, child_id, package_name, app_label, category, time_limit_minutes)
  values (v_family_id, p_child_id, p_package_name, p_app_label, p_category, p_time_limit_minutes)
  on conflict (child_id, package_name)
  do update set category = p_category, time_limit_minutes = p_time_limit_minutes, updated_at = now();
end;
$$;

-- RPC: Bulk sync apps from device (called by parent app after fetching from child)
create or replace function public.sync_child_apps(
  p_child_id uuid,
  p_apps jsonb
)
returns void
language plpgsql security definer as $$
declare
  v_family_id uuid;
  v_app jsonb;
begin
  select family_id into v_family_id from children where id = p_child_id;

  for v_app in select * from jsonb_array_elements(p_apps)
  loop
    insert into app_categories (family_id, child_id, package_name, app_label, category)
    values (
      v_family_id,
      p_child_id,
      v_app->>'packageName',
      v_app->>'label',
      'free'
    )
    on conflict (child_id, package_name) do nothing;
  end loop;
end;
$$;
