create table public.web_filters (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  category text not null,
  blocked_sites text[] default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.web_filters enable row level security;

create policy "Family members can manage web filters"
  on public.web_filters for all
  using (family_id = (select family_id from profiles where user_id = auth.uid()));
