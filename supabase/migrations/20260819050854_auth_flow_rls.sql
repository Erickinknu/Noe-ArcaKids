-- Auth flow and RLS: auto-profile on signup, family membership helpers, per-role policies.

-- Membership helpers ----------------------------------------------------------
-- SECURITY DEFINER is required here to read profiles without triggering RLS
-- recursion from within policies. Executed only by authenticated role; the
-- functions themselves assert auth.uid() membership.

create or replace function public.is_family_member(family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.family_id = is_family_member.family_id
      and p.user_id = auth.uid()
  );
$$;

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

revoke execute on function public.is_family_member(uuid) from public, anon;
revoke execute on function public.is_family_parent(uuid) from public, anon;
grant execute on function public.is_family_member(uuid) to authenticated;
grant execute on function public.is_family_parent(uuid) to authenticated;

-- Auto-create family + parent profile on signup ------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
begin
  insert into public.families (name)
  values ('Mi familia')
  returning id into new_family_id;

  insert into public.profiles (family_id, user_id, email, display_name, role)
  values (
    new_family_id,
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.email, ''),
      'Usuario'
    ),
    'parent'::public.app_role
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security policies -------------------------------------------------

-- families: read by members, rename by parents
create policy "members can read own families" on public.families
  for select to authenticated
  using (public.is_family_member(id));

create policy "parents can update own family" on public.families
  for update to authenticated
  using (public.is_family_parent(id))
  with check (public.is_family_parent(id));

-- profiles: read by family, self-management by owner
create policy "members can read family profiles" on public.profiles
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "users can update own profile" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- children: managed by parents, visible to all members
create policy "members can read children" on public.children
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "parents can insert children" on public.children
  for insert to authenticated
  with check (public.is_family_parent(family_id));

create policy "parents can update children" on public.children
  for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

create policy "parents can delete children" on public.children
  for delete to authenticated
  using (public.is_family_parent(family_id));

-- devices: owned by the family, linked to a child by parents
create policy "members can read devices" on public.devices
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "parents can insert devices" on public.devices
  for insert to authenticated
  with check (public.is_family_parent(family_id));

create policy "parents can update devices" on public.devices
  for update to authenticated
  using (public.is_family_parent(family_id))
  with check (public.is_family_parent(family_id));

create policy "parents can delete devices" on public.devices
  for delete to authenticated
  using (public.is_family_parent(family_id));

-- sessions: read-only in phase 1-3 (writes arrive with parental control)
create policy "members can read sessions" on public.sessions
  for select to authenticated
  using (
    exists (
      select 1
      from public.children c
      where c.id = sessions.child_id
        and public.is_family_member(c.family_id)
    )
  );

-- Grants (Data API exposure for authenticated only) ---------------------------
grant select, insert, update, delete on public.families, public.profiles, public.children, public.devices, public.sessions to authenticated;