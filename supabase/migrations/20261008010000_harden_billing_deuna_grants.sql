-- Endurece billing + DEUNA (aplicada en prod 2026-10-08).
-- claim_subscription: solo plan 'free'; family/family_annual via activate_subscription_from_order.
-- deuna_orders.INSERT queda abierto a authenticated (la app inserta directo),
-- gobernado por WITH CHECK + trigger validate_deuna_order + indice unico de pending.
-- UPDATE/DELETE/TRUNCATE revocados a nivel GRANT (solo service_role verifica).
create or replace function public.claim_subscription(p_plan text)
returns public.subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.subscriptions%rowtype;
  v_fam uuid;
  v_plan uuid;
begin
  if p_plan != 'free' then
    raise exception 'SOLO free disponible via claim_subscription. Usa activate_subscription_from_order para family/family_annual.';
  end if;
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  select p.family_id into v_fam
    from public.profiles p
   where p.user_id = auth.uid()
   order by p.created_at
   limit 1;
  if v_fam is null then
    raise exception 'NO_FAMILY';
  end if;
  select pl.id into v_plan
    from public.plans pl
   where pl.slug = 'free' and pl.is_active
   limit 1;
  if v_plan is null then
    raise exception 'FREE_PLAN_MISSING';
  end if;
  insert into public.subscriptions (user_id, family_id, plan_id, plan, product_id, provider, status, current_period_end)
  values (auth.uid(), v_fam, v_plan, 'free', 'free', 'manual', 'active', null)
  on conflict (user_id, product_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        provider = excluded.provider,
        family_id = excluded.family_id,
        plan_id = excluded.plan_id,
        updated_at = now()
  returning * into v_row;
  return v_row;
end;
$function$;
revoke all on function public.claim_subscription(text) from anon;
grant execute on function public.claim_subscription(text) to authenticated;

create or replace function public.activate_subscription_from_order(order_id uuid)
returns public.subscriptions
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.deuna_orders%rowtype;
  v_plan public.plans%rowtype;
  v_uid uuid;
  v_sub public.subscriptions%rowtype;
begin
  select * into v_order from public.deuna_orders where id = order_id;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status != 'verified' then
    raise exception 'ORDER_NOT_VERIFIED';
  end if;
  select * into v_plan from public.plans where slug = v_order.plan_slug and is_active;
  if not found then
    raise exception 'PLAN_UNKNOWN: %', v_order.plan_slug;
  end if;
  if v_plan.slug = 'free' then
    raise exception 'ORDER_PLAN_FREE';
  end if;
  select s.user_id into v_uid
    from public.subscriptions s
   where s.family_id = v_order.family_id
   order by s.created_at
   limit 1;
  if v_uid is null then
    select p.user_id into v_uid
      from public.profiles p
     where p.family_id = v_order.family_id
       and p.role = 'parent'
       and p.user_id is not null
     order by p.created_at
     limit 1;
  end if;
  if v_uid is null then
    raise exception 'NO_SUBSCRIBER';
  end if;
  insert into public.subscriptions (user_id, family_id, plan_id, plan, product_id, provider, status, current_period_end)
  values (v_uid, v_order.family_id, v_plan.id, v_plan.slug, v_order.plan_slug, 'manual', 'active',
    case when v_plan.slug = 'family_annual' then now() + interval '1 year'
         when v_plan.slug = 'family' then now() + interval '1 month'
         else null end)
  on conflict (user_id, product_id) do update
    set plan = excluded.plan,
        plan_id = excluded.plan_id,
        family_id = excluded.family_id,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        provider = excluded.provider,
        updated_at = now()
  returning * into v_sub;
  return v_sub;
end;
$function$;
revoke all on function public.activate_subscription_from_order(uuid) from anon;
revoke all on function public.activate_subscription_from_order(uuid) from authenticated;

revoke insert on public.deuna_orders from anon;
revoke update on public.deuna_orders from anon;
revoke delete on public.deuna_orders from anon;
revoke truncate on public.deuna_orders from anon;
revoke update on public.deuna_orders from authenticated;
revoke delete on public.deuna_orders from authenticated;
revoke truncate on public.deuna_orders from authenticated;

drop policy if exists "deuna_orders_family_parents_insert" on public.deuna_orders;
drop policy if exists "deuna_orders_update_service_role" on public.deuna_orders;
drop policy if exists "deuna_orders insert pending" on public.deuna_orders;
create policy "deuna_orders insert pending" on public.deuna_orders
  for insert with check (
    status = 'pending'
    and verified_at is null
    and verified_by is null
    and currency = 'USD'
    and is_family_parent(family_id)
  );

revoke all on function public.notify_push_on_notification() from anon;
revoke all on function public.notify_push_on_notification() from authenticated;
revoke all on function public.validate_deuna_order() from anon;
revoke all on function public.validate_deuna_order() from authenticated;
