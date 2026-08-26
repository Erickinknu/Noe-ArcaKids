create table public.geofences (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.geofences enable row level security;

create policy "Family members can manage geofences"
  on public.geofences for all
  using (family_id = (select family_id from profiles where user_id = auth.uid()));
