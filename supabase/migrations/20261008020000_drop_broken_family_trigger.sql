-- Elimina el trigger roto que abortaba todo INSERT en families
-- (ensure_family_subscription omitia user_id NOT NULL) y con ello todo signup
-- via handle_new_user. La funcion no tenia ningun otro consumidor.
-- Ver reporte seguridad 2026-10-08. Aplicada en prod 2026-10-08.
drop trigger if exists trg_families_ensure_subscription on public.families;
drop function if exists public.ensure_family_subscription();
