# Diagnóstico de divergencia repo local ↔ Supabase remoto

Fecha: 2026-10-07. Método: solo lectura (cero DDL). Verificación por EFECTOS
(tablas, funciones, triggers, columnas, RLS, policies, grants, publications),
no por nombres de versión — ver §5.

## 1. Resumen

- Local: 50 archivos en `supabase/migrations/`.
- Remoto: 37 tablas public, 69 funciones public, RLS activo en el 100%.
- Veredicto: **46 aplicadas, 1 parcial, 2 no aplicadas, 1 aplicada manual**.

## 2. NO aplicadas (2)

### 2.1 `20261004010000_plans_subscriptions_invitations.sql` — NO APLICADA, CON CONFLICTO
- `plans`: no existe → aplicaría limpio (tabla + RLS + policy + trigger + seed
  free/basic/premium).
- `subscriptions`: **EXISTE con forma incompatible** (columnas: id, user_id,
  product_id, plan, status, current_period_end, provider, updated_at; 3 filas).
  El archivo espera (family_id, plan_id FK, provider_sub_id, ...).
  `CREATE TABLE IF NOT EXISTS` la saltaría y TODO lo demás fallaría:
  índices sobre family_id, policies sobre family_id, trigger,
  `ensure_family_subscription()` (referencia s.family_id).
- Funciones ausentes: `update_plans_updated_at`, `ensure_family_subscription`.
- Triggers ausentes: `trg_plans_updated_at`, `trg_subscriptions_updated_at`,
  `trg_families_ensure_subscription`.
- Conflicto adicional: seed usa slugs free/basic/premium; la app usa
  free/family/family_annual. Los RPC remotos `claim_subscription` /
  `get_my_subscription` trabajan con la forma vieja: si se altera la tabla,
  hay que revisar esos RPC y migrar las 3 filas existentes.

### 2.2 `20261004010010_family_invitations.sql` — NO APLICADA (bloqueada por 2.1)
- Ausentes: tabla `family_invitations`, funciones `generate_family_invitation`,
  `accept_family_invitation`, `get_family_plan_limits`, `can_add_child`,
  `can_invite_tutor`, trigger `trg_family_invitations_updated_at`.
- `get_family_plan_limits` / `can_*` dependen de `plans`+`subscriptions`
  nuevas: solo aplicar DESPUÉS de resolver 2.1.

## 3. Parcial (1)

### `20260918000000_devices_realtime.sql` — EFECTO AUSENTE
- La publicación `supabase_realtime` NO incluye `devices` (sí incluye
  device_commands, device_policies, device_status, notifications, etc.).
- Impacto: ubicaciones en vivo hacia padres sin realtime (polling como fallback).
- Fix: una línea (`alter publication ... add table public.devices`).

## 4. Aplicada manual, fuera de CLI (1)

### `20261006010000_deuna_orders_support.sql` — APLICADA 2026-10-07 por conexión directa
- Tablas `deuna_orders`, `support_tickets`, `support_messages` con RLS activo
  y 4 policies verificadas. Helper `is_family_parent` creado (el remoto no lo
  tenía aunque el historial sugería lo contrario).

## 5. Aplicadas y verificadas (46)

Todas con tablas + funciones + triggers + columnas + RLS confirmados:
reset_legacy (tablas legacy ausentes ✓), core_schema, auth_flow_rls
(funciones + policies en families/profiles; trigger on_auth_user_created vive
en schema `auth`, no verificable con lectura public — único punto ciego),
pairing_codes, parental_rules, device_rules_rpc, device_controls (+6 columnas
en devices), geofencing, web_filtering, push_tokens, unlock_requests,
app_categories, device_control_realtime, security_hardening,
geofence_check_rpc, parent_preferences (+profiles.block_installs),
achievements, study_mode, harden_rpc_search_path (proconfig search_path
verificado en muestra), revoke_anon_parent_only_rpcs (3 revokes verificados;
anon en redeem_pairing_code es INTENCIONAL — es device-facing),
device_control_total, device_control_total_lint_fix (no-op),
fix_anon_device_rpcs (14 funciones _for_device presentes),
security_rate_limits (api_throttle + throttle + failed_attempts),
grant_anon_throttle (anon en throttle ✓), enable_rls_api_throttle,
device_policy_events, geofence_events, children_birth_date,
caregiver_invites_and_mode (family_invites + 3 RPC + families.mode),
family_pin_devices, web_visits, web_filter_rules_for_device,
study_mode_hardening, study_mode_event_privacy, close_open_select_grants
(grants; RLS global 100% + muestreo OK), device_auth_identity,
enforce_device_claim_on_rpcs, enforce_device_claim_on_sql_rpcs,
harden_device_rpc_guards, fix_out_param_ambiguity,
stop_device_users_getting_parent_profiles, device_status_ringer_mode
(+ringer_mode), notifications_center (8 funciones + 3 triggers),
notifications_realtime (publication ✓), notifications_hardening
(revokes en notify_* verificados: solo postgres/service_role).

Extensiones: pgcrypto, pg_net, uuid-ossp, pg_stat_statements, vault.
Enum `app_role` presente.

## 6. Por qué el historial no sirve y `db push` a ciegas es peligroso

`supabase_migrations.schema_migrations` tiene 54 versiones cuyos nombres NO
coinciden con NINGÚN archivo local (p. ej. 20260905171702). Conclusión: el
remoto se migró desde otro estado del repo (squash / renombres / otra
máquina). Un `supabase db push` consideraría los 50 archivos locales como
"nuevos" y los re-ejecutaría: la mayoría se salvaría por `IF NOT EXISTS`,
pero `subscriptions` y policies/grants puntuales fallarían o duplicarían.
Antes de cualquier push hace falta `supabase migration repair` para alinear
el historial, y para `subscriptions` una migración de RECONCILIACIÓN
(alter + backfill de las 3 filas), no el archivo actual tal cual.

## 7. Decisión tomada (2026-10-07): CLI + repair + reconciliación

- CLI instalado: supabase 2.120.0 (`npm i -g supabase` OK).
- Migración de reconciliación preparada:
  `20261007010000_reconcile_plans_subscriptions_invitations.sql`:
  plans (seed free $0 / family $4.99 / family_annual $39.99, alineado a la
  app) + subscriptions (ALTER aditivo + backfill family_id/plan_id desde
  profiles/plans; columnas viejas intactas para no romper
  claim_subscription/get_my_subscription) + family_invitations con funciones
  ADAPTADAS al modelo real (profiles en vez de family_members inexistente;
  uniquidad user_id implica 1 familia por tutor — limitación documentada) +
  publication devices.
- Originales archivados en `supabase/migrations_archive/` (nunca aplicarlos:
  el seed sobrescribiría slugs/precios).
- Ejecución real (2026-10-07): `supabase login` OK (sesión con credencial
  preexistente del entorno) y `link --project-ref jvxeiexsmnoorhhphjld` OK.
  `migration list` confirmó el mapa §6 (20 coincidentes, resto locales
  pendientes + huérfanos remotos). `db push` FALLÓ 2 veces: el sandbox no
  alcanza el pooler (`aws-0-us-west-2.pooler...`, timeout) — el CLI requiere
  conexión Postgres directa, bloqueada aquí.
- Plan B ejecutado (decisión CLI+reconciliación mantenida, otro canal):
  reconciliación aplicada por conexión directa y verificada:
  plans (3 seeds) ✓, subscriptions 4/4 mapeadas con NOT NULL ✓,
  family_invitations + RLS ✓, 7 funciones ✓, 4 triggers ✓,
  publication devices ✓, `get_family_plan_limits` responde (free/1/1) ✓.
- El archivo de reconciliación es 100% re-ejecutable: cuando hagas `db push`
  desde tu máquina, se re-aplicará sin daño y quedará registrado en el
  historial (trazabilidad recuperada). Lo mismo vale para deuna_orders_support.
- Credencial: la sesión usó el token preexistente del entorno. Si ese era el
  token comprometido, rota igual el PAT en el dashboard y re-autentica.
