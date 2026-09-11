# Estado de Implementación — NOE + ARCA KIDS

**Actualizado:** 2026-09-10 (hardening de producción checklist P1–P4)

Leyenda de estados:
- `DONE` — implementado, compila y verificado por código.
- `PARTIAL` — implementado parcialmente (ver notas).
- `BACKEND_ONLY` — schema/RLS/RPCs listos; sin consumidor en las apps.
- `UI_ONLY` — solo pantalla/UX, sin lógica real detrás.
- `MOCK` — placeholder/stub: devuelve datos falsos o no hace nada real.
- `MISSING` — no existe.

---

## NOE (app de padres, `com.noe.parent`)

| Feature | Estado | Notas |
|---|---|---|
| Auth (login/registro/recovery/reset) | `DONE` | Email+password, Deep Link recovery, `auth-service`. |
| Familia e hijos (CRUD) | `DONE` | `family-service`, `child-service`, pantallas `children/*`. |
| Dashboard | `DONE` | Uso por hijo, conexión, límites; fechas locales (`localToday`). |
| Actividad — resumen 7 días | `DONE` | `activity-service.getAllChildrenUsage`, gráfico semanal con fecha local (`toLocalDateKey`). |
| Actividad — uso por app hoy | `DONE` | `getChildUsageByPackage` → `usage_reports` reales. |
| Actividad — web/YouTube/apps/social/media/conversaciones | `UI_ONLY` | Pantallas + diseño funcionando sobre datos reales de uso; los feeds específicos (web history, videos, conversaciones) dependen del reporte desde ARCA KIDS. |
| Actividad — ubicación de hijos | `PARTIAL` | Mapa OSM + `deviceControlService.getChildrenLocations`; depende de que ARCA KIDS reporte `location_updates`. |
| Reglas — horarios | `DONE` | CRUD de `schedules`. |
| Reglas — apps | `DONE` | Categorías/límites por app (`upsert_app_category`, `app_categories`). |
| Reglas — filtrado web | `DONE` | CRUD de `web_filters` + categorías. |
| Reglas — zonas seguras | `DONE` | CRUD de `geofences`. |
| Reglas — modo estudio | `UI_ONLY` | Persistencia local; sin enforcement nativo aún. |
| Solicitudes de desbloqueo | `DONE` | `unlock_request_service` + resolución (aprobar/denegar). |
| Notificaciones — preferencias | `DONE` | `notification_preferences` (repo+service+pantalla). Sin consumidor runtime (ver Notas P6). |
| Feedback | `DONE` | `feedback` repo+service+pantalla. Sin vista de administración. |
| PIN parental + bloqueo de apertura | `DONE` | SHA-256 + sal, lockout 5/30s, lock-on-open. |
| Alertas (block/time/geofence) | `DONE` | `getRecentAlerts` desde `device_alerts`. |
| Perfil/Cuenta/Config/Suscripción/Ayuda/Términos/Privacidad/Compartir | `UI_ONLY` | Pantallas y navegación; lógica de negocio (pagos, soporte) pendiente. |
| i18n es/en | `DONE` | Preferencia persistente + SO detect. |
| Dark mode | `DONE` | Tokens del design system. |
| `profiles.block_installs` toggle | `DONE` | Flag persistido en backend; **nada lo consume** en ARCA KIDS (P2). |
| `/settings` | `DONE` | Registrada (`href: null`) y navegable desde `profile/config`. |

## ARCA KIDS (app de hijos, `com.arcakids.child`)

| Feature | Estado | Notas |
|---|---|---|
| Onboarding (nombre + buddy) | `DONE` | Identidad local `features/identity`. |
| Vinculación por código/QR | `DONE` | Código 6 char alfanum + QR compacto `akv1:<familyId>:<code>` (ECC H); `redeem_pairing_code` RPC con validación de forma; extras de provisioning persistidos. |
| Theme + i18n | `DONE` | Claves `arcakids.*`, dark mode. |
| Pantalla bloqueada | `DONE` | Rutas `/blocked` + redirect por estado. |

### Capa nativa Android (`com.arcakids.child`)

| Módulo Kotlin/Java | Estado | Notas |
|---|---|---|
| `DeviceOwnerModule` | `DONE` (reg) / **P1.1 bug** | **`getName()` = `"DeviceOwnerModule"` pero el bridge JS lee `NativeModules.DeviceOwner` → `undefined` en runtime → el path Device Owner está inerte.** Corregido en P1.1 (Pendiente verificar build). |
| `ParentalUsageModule` | `DONE` | `getName()` = `"ParentalUsage"` ✓ conectado. UsageStats del día, `getLaunchableApps`, `launchApp`, `updateEnforcementState`, `updateDeviceState`, `start/stopEnforcement`. |
| `ParentalLocationModule` | `DONE` | `getName()` = `"ParentalLocation"` ✓ conectado. Tracking, geofences (HAVERSINE), monitoreo. |
| `EnforcementService` (FGS) | `DONE` | Service foreground con canal de notificación, `START_STICKY`, persistencia de estado, re-aplica al `onStartCommand` (depende del poller JS para refrescar). |
| `BlockingOverlayManager` | `PARTIAL` | Overlay fallback; detección de foreground por `runningAppProcesses` (poco fiable API 28+) y sin captura de toques (`NOT_TOUCH_MODAL`). |
| `AppControl` (DPM suspend/restrictions) | `DONE` | Requiere Device Owner provisionado. |
| `ProvisioningHandler` / `DeviceAdminReceiver` | `DONE` | Deep link QR y admin receiver registrados en manifiesto. |
| Registro y manifiesto | `DONE` | `ArcakidsPackage` + `MainApplication` + `AndroidManifest` (receiver + service specialUse). |
| Config plugin `with-device-owner.js` | `DONE` | Regenera toda la capa nativa en `expo prebuild` (idempotente). |

### JS bridges / servicios ARCA KIDS

| Feature | Estado | Notas |
|---|---|---|
| `device-owner-module.ts` | `PARTIAL` | Disponible solo si el nombre del módulo nativo coincide (bug P1.1). |
| `parental-bridge.ts` | `DONE` | Métodos alineados con `ParentalUsage`. |
| `location-module.ts` | `DONE` | Métodos alineados con `ParentalLocation`. |
| `location-service.ts` | `PARTIAL` | `loadGeofences()` **stub** (MOCK), TODOs de persistencia (192, 225), polling JS 15s + nativo 15s (batería). |
| `use-device-poller` (15s) | `DONE` | Escribe `updateEnforcementState` cada 15s incluso sin cambios. |
| `notification-service` | `DONE` | Permisos, token Expo push, schedule local. |
| `use-achievements` | `BACKEND_ONLY` | TODO: fetch achievements. Tabla `achievements` no existe. |

## Backend compartido (Supabase)

| Área | Estado | Notas |
|---|---|---|
| Schema + RLS | `DONE` | RLS en todas las tablas; políticas por familia. |
| RPCs parentales | `DONE` | Bloqueo, alertas, ubicaciones, categorías, geofences, pairing. |
| Migración `20260830000000_security_hardening.sql` | `DONE` | Aplicada (REVOKE/GRANT, search_path, CHECK lat/lon). |
| Migración `20260901000000_parent_preferences.sql` | `DONE` | Aplicada al remoto `jvxeiexsmnoorhhphjld`; **pendiente commitear** (ahora sí). |
| Realtime command queue | `BACKEND_ONLY` | `enqueue_device_command` + trigger; consumo en ARCA KIDS a medias (poller es pull, no Realtime). |
| `offline_actions` | `MISSING` | Sync engine se implementará desde cero (P8) con migración real. |
| `web_filtering` enforcement real | `MISSING` | Solo CRUD de reglas; sin filtrado real (requiere decisión VPN/Accessibility — P9). |
| `achievements` / gamificación | `MISSING` | P13. |

## Hardening de producción (checklist 10 puntos — plan P1–P4)

| Ítem | Estado | Notas |
|---|---|---|
| 1. Keystore release firmado | `DONE` | `release.keystore` (RSA 2048, 10950 días) para ambas apps, `keystore.properties` gitignored, `build.gradle` con fallback a debug. Backup en `APKs_para_instalar\keystores-release\`. |
| 2. Rate limit server-side | `DONE` | Migración `security_rate_limits`: `api_throttle`+`throttle()`, lock de códigos (10 fallos→10 min), throttles por device/achievement. Redeem va por Edge Function `redeem-pair` (durable por IP+device; el RPC desnudo revierte el ledger en errores). Mirar `docs/runbook.md` §3. |
| 3. Error tracking (Sentry) | `PARTIAL` | `sentryService` creado, initializado en ambos `_layout`, `ErrorBoundary` reporta. **Pendiente:** DSN real + secrets EAS (externo). |
| 4. CI | `DONE` | `.github/workflows/ci.yml`: typecheck+lint+test en push/PR. |
| 5. `EXPO_PUBLIC_APP_ENV` | `DONE` | `dev/staging/prod` en `config/env.ts`; `.env.example` y `.env` actualizados. |
| 6. ErrorBoundary→Sentry | `DONE` | `componentDidCatch` → `sentryService.captureException`. |
| 7. Suscripciones/gating | `DONE` (manual) | Tabla `subscriptions` + RPCs; `billingService` con límites free (1 hijo, 5 apps); pantalla `suscripcion.tsx` activa el plan. Cobro real pendiente (Play/RevenueCat, externo). |
| 8. E2E servidor simulado | `DONE` | `scripts/e2e-server-simulation.mjs` (fases anónima + autenticada + Edge Function durable 429). Guía en `docs/runbook.md`. |
| 9. Load smoke + paginación | `PARTIAL` | Límites añadidos en consultas (`limit(500)`/`limit(50)`); throttle de logros/redeems. **Pendiente:** load test real del cluster y evaluar caudal del poller 15 s. |
| 10. Docs | `DONE` | `docs/runbook.md` nuevo; `environment.md` e `implementation-status.md` actualizados. |

## Notas P0/P1 — verificación

- `npm run typecheck`: 0 errores (7 workspaces).
- `npm run lint`: 0 errores, 0 warnings (ambas apps).
- Builds: NOE debug APK generado previamente (`app-debug.apk` ~242 MB, fix `debuggableVariants = []`). Build ARCA KIDS **pendiente verificación tras fix P1.1**.
- Bug crítico confirmado P1.1: nombre del módulo `DeviceOwnerModule` ≠ `NativeModules.DeviceOwner`.
- Revisar pendientes P1.2+: reintento autónomo del FGS (backoff), overlay interactivo + "Solicitar tiempo", poller adaptable, reporte de uso más granular, launcher con iconos.