create table public.unlock_requests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.unlock_requests enable row level security;

create policy "Family members manage unlock requests"
  on unlock_requests for all
  using (family_id = (select family_id from profiles where user_id = auth.uid()));
