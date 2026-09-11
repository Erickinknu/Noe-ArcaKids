# Runbook de operaciones — NOE + ARCA KIDS

Última actualización: 2026-09-10.

## 1. Builds de release (firmados)

Los APKs de producción se firman con un keystore release local. **No está publicado en el repo.**

- Keystore: `apps/<app>/android/app/release.keystore` (gitignored).
- Credenciales: `apps/<app>/android/app/keystore.properties` (gitignored).
- Backup con instrucciones y contraseñas: `C:\Users\Usuario\Documents\APKs_para_instalar\keystores-release\`.
- Cualquier `gradlew assembleRelease` re-firma con el mismo keystore → misma firma en updates.
- Cambiar de keystore rompe las instalaciones previas (habría que desinstalar e instalar de nuevo).

Build del release ARCA KIDS (solo `arm64-v8a` por longitud de rutas):

```powershell
cd apps/arcakids/android
.\gradlew.bat assembleRelease
# APK en apps/arcakids/android/app/build/outputs/apk/release/
```

> Nunca usar `npm run build:*`. Git fuera de PATH en PowerShell: `& "C:\Program Files\Git\bin\git.exe"`.

## 2. Sentry

Habilitar en producción:

1. Crear proyecto Sentry y un DSN.
2. `apps/<app>/.env`: `EXPO_PUBLIC_SENTRY_DSN=<dsn>`.
3. EAS secrets `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (activan el plugin `sentry-expo` y el upload de sourcemaps en el build).
4. El init es defensivo: sin DSN no hace nada y no rompe el runtime. Los errores capturados en runtime pasan por `sentryService` (`packages/shared/src/services/sentry-service.ts`), incluyendo `ErrorBoundary.componentDidCatch`.

## 3. Rate limiting del lado servidor

Migración `20260912000000_security_rate_limits.sql` (`api_throttle` + RPC `throttle`).

| Ruta | Regla |
|---|---|
| `redeem_pairing_code` (vía Edge Function `redeem-pair`) | throttle durable por IP (`ip:<IP>` 30/60 s) + por dispositivo (`pairing:<uuid>` 30/60 s) + lock por código: 10 fallos → 10 min. |
| `increment_achievement_for_device` | throttle `achievement:<device>:<key>` 60/60 s. |

TS refresca client-side `checkRateLimit` (defensa en capas): `packages/shared/src/rate-limiter.ts`.

**Por qué existe `redeem-pair` (Edge Function)**: un RPC de PostgREST que lanza excepción aborta **toda su transacción**, revirtiendo el ledger `api_throttle` que acabase de escribir (los fallos no se acumulan). La función de borde hace cada llamada a `throttle()` en su propia transacción DB que sí commitea (aunque luego respondamos 429/400 como JSON plano), por lo que el contador por IP/dispositivo es persistente. La app llama a la función vía `supabase.functions.invoke('redeem-pair', …)` (`linkingRepository.redeem`); la función valida entrada, aplica throttles y delega en el RPC `redeem_pairing_code` (mismas ACL/políticas).

Detalles de operación:

- Desplegar/actualizar la función: `supabase functions deploy redeem-pair` (con `verify_jwt=false`; es endpoint anónimo con validación propia). Código en `supabase/functions/redeem-pair/`.
- El RPC `redeem_pairing_code` desnudo **no** acumula intentos fallidos (rollback) — es intencionado; la limitación durable de redemptions vive en la función.
- `failed_attempts`/`locked_until` en `pairing_codes` son defense-in-depth y solo persisten si el redeem **commitea**; no bloquear al atacante tras 35 ráfagas por IP rotando UUIDs (el bloqueo real es el throttle por IP de la función).

## 4. Planes y suscripciones (estado actual)

- Tabla `subscriptions` + RPCs `get_my_subscription()` y `claim_subscription(p_plan)`.
- `claim_subscription` es un camino **manual** temporal: cualquier usuario autenticado puede activar un plan. Cuando se conecte cobro real (Play Billing o RevenueCat) los pagos insertarán filas con `provider='play'|'revenuecat'` (webhook/`service_role`), y `claim_subscription` debe restringirse o eliminarse.
- Gating en app NOE (`billingService`): plan free → 1 hijo (`FREE_MAX_CHILDREN`) y 5 apps bloqueadas (`FREE_MAX_BLOCKED_APPS`). El servicio cachea el plan 30 s.
- La pantalla `suscripcion.tsx` ya no dice "Próximamente": activa el plan al instante (modo manual).

## 5. Configuración de Supabase

- Proyecto único dev/prod: `jvxeiexsmnoorhhphjld`. **Pendiente separar un proyecto de producción** antes de lanzar.
- Aplicar migraciones con la herramienta de migraciones de Supabase (SQL editor / `supabase db push`).
- Seguridad: nunca usar `service_role` en las apps. Solo anon/publishable keys.

## 6. CI/CD

- `.github/workflows/ci.yml`: typecheck + lint + test en cada push/PR (ubuntu, Node 24, `npm ci`).
- Release builds firmados se hacen localmente (keystore no está en CI).

## 7. E2E simulado del lado servidor

```powershell
node scripts/e2e-server-simulation.mjs            # fase anónima
$env:E2E_EMAIL="parent-e2e@example.com"; $env:E2E_PASSWORD="..."; node scripts/e2e-server-simulation.mjs
$env:E2E_RUN_BURST="1"; node ...                   # ráfaga 40× contra el edge function → 429 durable
```

Crea el usuario de prueba una vez (registro normal en la app, confirmar email). Reporte JSON en `%TEMP%\e2e-server-simulation-report.json`.

Fases: A) anónima (ACL y guards), B) autenticada (claim plan + bursts de RPC), C) `redeem-pair` Edge Function (validación + throttle durable por IP).

## 8. Load smoke test (P4.9)

La auditoría **no** ejecutó load test contra el cluster. Estados actuales:

- `dashboard`/`activity` acotadas con `.limit(500)` (PAQUETE de uso) y `.limit(50)` (unlock requests); consultas 7 días → ~7 filas/hijo/día.
- Heartbeat: poller ARCA KIDS 15 s (`use-device-poller`); cada tick escribe `updateEnforcementState` y `device.last_seen_at` — con N hijos conectados = N×4 updates/min; revisar antes de escala.
- El throttle `api_throttle` evita abuso de redeems/logros anónimos.

## 9. Play Store / publicación

- Play Console requiere upload de clave nueva o reutilizar firma de app signing por app. Los keystores `arcakids-release` y `noe-release` respaldan la firma actual.
- E2E en dispositivo físico: instalar APK release (firma nueva) y seguir `docs/implementation-status.md` para flujo kitten.