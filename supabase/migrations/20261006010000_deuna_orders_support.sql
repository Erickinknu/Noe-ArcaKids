-- DEUNA (Ecuador, estructura manual) + Soporte (tickets).
-- Flujo DEUNA v1: la app inserta una orden `pending`; el admin verifica el
-- pago en su app DEUNA y activa el plan desde el panel admin.
-- Autocontenida: crea is_family_parent si el remoto no lo tiene.

create or replace function public.is_family_parent(family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.family_id = is_family_parent.family_id
      and p.user_id = auth.uid()
      and p.role = 'parent'::public.app_role
  );
$$;

revoke execute on function public.is_family_parent(uuid) from public, anon;
grant execute on function public.is_family_parent(uuid) to authenticated;

create table if not exists public.deuna_orders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  plan_slug text not null,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists deuna_orders_family_id_idx on public.deuna_orders(family_id);
create index if not exists deuna_orders_status_idx on public.deuna_orders(status);

alter table public.deuna_orders enable row level security;

drop policy if exists deuna_orders_family_parents_read on public.deuna_orders;
create policy deuna_orders_family_parents_read on public.deuna_orders
  for select using (public.is_family_parent(family_id));

drop policy if exists deuna_orders_family_parents_insert on public.deuna_orders;
create policy deuna_orders_family_parents_insert on public.deuna_orders
  for insert with check (public.is_family_parent(family_id));

-- Soporte: tickets + mensajes (padre <-> admin).
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_role text not null check (sender_role in ('parent', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_family_id_idx on public.support_tickets(family_id);
create index if not exists support_messages_ticket_id_idx on public.support_messages(ticket_id);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

drop policy if exists support_tickets_family_parents_all on public.support_tickets;
create policy support_tickets_family_parents_all on public.support_tickets
  for all using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

drop policy if exists support_messages_family_parents_all on public.support_messages;
create policy support_messages_family_parents_all on public.support_messages
  for all using (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and public.is_family_parent(t.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and public.is_family_parent(t.family_id)
    )
  );
