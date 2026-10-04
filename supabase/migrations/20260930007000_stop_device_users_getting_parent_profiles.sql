-- Impedir que una identidad de dispositivo obtenga perfil de padre.
--
-- Hallazgo reproduced en produccion al emparejar un dispositivo de prueba:
--
--   handle_new_user se dispara en cada INSERT de auth.users, incluidas las
--   identidades sinteticas que crea redeem-pair. Para un usuario de dispositivo
--   esa funcion insertaba una familia nueva ('Mi familia') y un perfil con
--   role = 'parent'.
--
--   Como is_family_member e is_family_parent se resuelven looking profiles por
--   user_id = auth.uid(), el dispositivo pasaba a ser miembro y, sobre todo,
--   PADRE de esa familia ficticia. Eso le daba via de escritura a todo lo que
--   exige is_family_parent: children, geofences, web_filters, app_categories,
--   usage_schedules, device_commands, device_status, unlock_requests,
--   pairing_codes y family_invites.
--
--   El radio de impacto immediate se limita a la familia ficticia, no a la
--   familia real del Nino. Pero la forma es una escalada de privilegios: una
--   identidad que solo deberia poder consultar su propio estado aparece con
--   autoridad de administrador, y basta con que el perfil se enlazara alguna vez
--   a la familia real para que el dispositivo_la controlara por completo.
--
-- El arreglo tiene tres capas, de la mas fuerte a la mas débil:
--
--   1. is_family_parent / is_family_member devuelven false siempre que el
--      llamante sea una identidad de dispositivo. Esta es la capa que sostiene
--      la seguridad: aunque exista un perfil con role='parent', aunque lo creo
--      una version antigua del trigger, el RLS sigue fallando cerrado.
--   2. handle_new_user deja de crear familia y perfil para usuarios de
--      dispositivo, de modo que no se generen datos basura.
--   3. Limpieza de las filas ficticias ya creadas.

-- ─────────────────────────────────────────────────────────────────────────────
-- Capa 1: fail-closed en los predicados de RLS
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.is_device_identity()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.devices d
     where d.device_auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_device_identity() from public, anon;
grant  execute on function public.is_device_identity() to authenticated, service_role;

create or replace function public.is_family_member(family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Una identidad de dispositivo no es miembro de ninguna familia. Su
  -- autorizacion sale exclusivamente de devices.device_auth_user_id, a traves
  -- de current_device_uuid() y de los guards de los RPC.
  select case
           when public.is_device_identity() then false
           else exists (
             select 1
               from public.profiles p
              where p.family_id = is_family_member.family_id
                and p.user_id = auth.uid()
           )
         end;
$$;

create or replace function public.is_family_parent(family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Mismo cierre: un dispositivo nunca es padre, aunque un perfil residual diga
  -- lo contrario.
  select case
           when public.is_device_identity() then false
           else exists (
             select 1
               from public.profiles p
              where p.family_id = is_family_parent.family_id
                and p.user_id = auth.uid()
                and p.role = 'parent'::public.app_role
           )
         end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Capa 2: handle_new_user no crea familia ni perfil para dispositivos
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  is_device    boolean;
begin
--   Se detectan las dos señales porque llegan por caminos distintos: la
--   metadata la fija el Edge de emparejamiento, que es de confianza, y el
--   sufijo del correo actúa como red de seguridad si esa metadata se perdiera.
  is_device :=
       coalesce(new.raw_user_meta_data ->> 'role', '') = 'device'
    or coalesce(new.email, '') like '%@device-arcakids.invalid';

  if is_device then
    -- Sin familia, sin perfil. Un dispositivo no pertenece a una familia de
    -- usuarios: pertenece a un child concreto a traves de devices.child_id.
    return new;
  end if;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Capa 3: limpieza de las familias y perfiles ficticios ya existentes
-- ─────────────────────────────────────────────────────────────────────────────
-- Se borran unicamente los perfiles y familias creados para identidades de
-- dispositivo, nunca filas de usuarios reales. Las familias se eliminan solo si
-- se quedan sin ningun perfil y sin ningun hijo, para no tocar datos de personas.
delete from public.profiles p
 where p.role = 'parent'::public.app_role
   and coalesce(p.email, '') like '%@device-arcakids.invalid'
   and exists (
     select 1 from public.devices d
      where d.device_auth_user_id = p.user_id
   );

delete from public.families f
 where coalesce(f.name, '') = 'Mi familia'
   and not exists (select 1 from public.profiles p where p.family_id = f.id)
   and not exists (
     select 1
       from public.children c
       join public.devices d on d.child_id = c.id
      where c.family_id = f.id
   );
