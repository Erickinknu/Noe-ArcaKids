-- Fase 4: corregir límites de plan y hacerlos efectivos en el servidor.
--
-- Bug previo: `can_add_child`/`can_invite_tutor` usaban
-- `coalesce(max_children, 1)`, de modo que los planes de pago
-- (max_children/max_tutors = null => ilimitado) quedaban tratados como 1.
-- Aquí NULL vuelve a significar ilimitado.

-- 1) can_add_child
create or replace function public.can_add_child(_family_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce(
    (
      select l.max_children is null
          or l.max_children >
             (select count(*) from public.children c where c.family_id = _family_id)
        from public.get_family_plan_limits(_family_id) l
    ),
    true
  );
$function$;

-- 2) can_invite_tutor
create or replace function public.can_invite_tutor(_family_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select coalesce(
    (
      select l.max_tutors is null
          or l.max_tutors >
             (select count(*) from public.profiles p
               where p.family_id = _family_id and p.role = 'parent'::public.app_role)
        from public.get_family_plan_limits(_family_id) l
    ),
    true
  );
$function$;

-- 3) Enforcement al agregar un hijo.
create or replace function public.enforce_child_limit()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.can_add_child(new.family_id) then
    raise exception 'child limit reached';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_enforce_child_limit on public.children;
create trigger trg_enforce_child_limit
  before insert on public.children
  for each row execute function public.enforce_child_limit();

-- 4) Enforcement de tutores: al crear la invitación y al canjearla.
create or replace function public.create_family_invite(
  p_family_id uuid,
  p_expires_minutes integer default 4320
)
returns table(code text, expires_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_code text;
  v_expires timestamptz;
begin
  if not public.is_family_parent(p_family_id) then
    raise exception 'not allowed';
  end if;

  if not public.can_invite_tutor(p_family_id) then
    raise exception 'tutor limit reached';
  end if;

  v_expires := now() + make_interval(mins => greatest(60, least(p_expires_minutes, 43200)));

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.family_invites where code = v_code);
  end loop;

  insert into public.family_invites (family_id, code, created_by, expires_at)
  values (p_family_id, v_code, auth.uid(), v_expires);

  return query select v_code, v_expires;
end;
$function$;

create or replace function public.redeem_family_invite(p_code text)
returns table(family_name text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_invite public.family_invites%rowtype;
  v_uid uuid := auth.uid();
  v_name text;
  v_current_family uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_invite
  from public.family_invites
  where code = upper(trim(p_code));

  if not found then
    raise exception 'invalid code';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'already used';
  end if;

  if now() > v_invite.expires_at then
    raise exception 'expired';
  end if;

  select p.family_id into v_current_family
    from public.profiles p where p.user_id = v_uid;

  if v_current_family is not null and v_current_family <> v_invite.family_id then
    raise exception 'already_member_other_family';
  end if;

  if exists (
    select 1 from public.profiles
    where user_id = v_uid and family_id = v_invite.family_id
  ) then
    update public.family_invites
    set accepted_by = v_uid, accepted_at = now()
    where id = v_invite.id;
  else
    if not public.can_invite_tutor(v_invite.family_id) then
      raise exception 'tutor limit reached';
    end if;

    update public.profiles
    set
      family_id = v_invite.family_id,
      role = 'parent'::public.app_role,
      updated_at = now()
    where user_id = v_uid;

    if not found then
      raise exception 'no profile';
    end if;

    update public.family_invites
    set accepted_by = v_uid, accepted_at = now()
    where id = v_invite.id;
  end if;

  select name into v_name from public.families where id = v_invite.family_id;
  return query select v_name;
end;
$function$;
