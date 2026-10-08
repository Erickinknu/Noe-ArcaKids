-- get_family_plan_limits: fallback al plan free cuando la familia no tiene
-- fila en subscriptions (recien registrados). Aplicada en prod 2026-10-08.
create or replace function public.get_family_plan_limits(_family_id uuid)
returns table(slug text, max_children integer, max_tutors integer, max_devices integer, features jsonb, status text, current_period_end timestamp with time zone)
language sql
stable security definer
set search_path to 'public'
as $function$
  with sub as (
    select s.status, s.current_period_end, s.plan_id
      from public.subscriptions s
     where s.family_id = _family_id
     order by s.created_at desc
     limit 1
  )
  select p.slug, p.max_children, p.max_tutors, p.max_devices, p.features,
         coalesce((select status from sub), 'active'),
         (select current_period_end from sub)
    from public.plans p
   where p.id = coalesce(
           (select plan_id from sub),
           (select id from public.plans where slug = 'free' and is_active limit 1)
         );
$function$;
