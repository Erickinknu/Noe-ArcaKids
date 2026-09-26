# Estado de Implementación — NOE + ARCA KIDS

**Actualizado:** 2026-09-25 (cierre de tanda: paleta cálida NOE activada, dashboard con KPIs, privacidad/términos completos y cliente push en NOE; versión 1.4.0 / versionCode 12)

Leyenda de estados:
- `DONE` — implementado, compila y verificado en código.
- `PARTIAL` — implementado parcialmente (ver notas).
- `BACKEND_ONLY` — schema/RLS/RPCs listos; sin consumidor en las apps.
- `UI_ONLY` — solo pantalla/UX, sin lógica real detrás.
- `MOCK` — placeholder/stub: devuelve datos falsos o no hace nada real.
- `MISSING` — no existe.

Fuente de verdad de versión: `apps/<app>/app.config.ts` (`1.4.0` / versionCode `12`). El `android/app/build.gradle` se sincroniza con esa fuente (prebuild o edición directa); nunca al revés.

---

## NOE (app de padres, `com.noe.parent`)

| Feature | Estado | Notas |
|---|---|---|
| Auth (login/registro/recovery/reset) | `DONE` | Email+password, Deep Link recovery, `auth-service`. |
| Familia e hijos (CRUD) | `DONE` | `family-service`, `child-service`, pantallas `children/*`. |
| Dashboard | `DONE` | Uso por hijo, conexión, límites; fechas locales (`localToday`). |
| Actividad — resumen 7 días | `DONE` | `activity-service.getAllChildrenUsage`, gráfico semanal con fecha local. |
| Actividad — uso por app hoy | `DONE` | `getChildUsageByPackage` → `usage_reports` reales. |
| Actividad — web/YouTube/apps/social/media | `PARTIAL` | Historial web real (`web_visits` → `/activity/sitios` con `get_child_web_visits`); feeds de YouTube/videos/social dependen del reporte desde ARCA KIDS. |
| Actividad — ubicación de hijos | `PARTIAL` | Mapa OSM + `getChildrenLocations`; depende del reporte de ARCA KIDS. |
| Reglas — horarios | `DONE` | CRUD de `schedules`. |
| Reglas — apps | `DONE` | Categorías/límites (`upsert_app_category`, `app_categories`). |
| Reglas — filtrado web | `DONE` | CRUD de `web_filters`. |
| Reglas — zonas seguras | `DONE` | CRUD de `geofences`. |
| Reglas — modo estudio | `UI_ONLY` | Persistencia local; sin enforcement nativo aún. |
| Solicitudes de desbloqueo | `DONE` | `unlock_request_service` + resolución. |
| Notificaciones — preferencias | `DONE` | `notification_preferences`. |
| Notificaciones — cliente push | `DONE` | `push-notification-service`: token Expo registrado en `push_tokens` al autenticar y borrado al salir (`_layout.tsx`), canal Android y handlers foreground/response. Push remoto real en APK release requiere `google-services.json` de Firebase. |
| Feedback | `DONE` | `feedback` repo+service+pantalla. |
| PIN parental + bloqueo de apertura | `DONE` | SHA-256 + sal, lockout, lock-on-open. |
| Alertas (block/time/geofence) | `DONE` | `getRecentAlerts` desde `device_alerts`. |
| Perfil/Cuenta/Config/Suscripción/… | `UI_ONLY` | Pantallas y navegación; pagos/soporte pendientes. |
| i18n es/en · Dark mode | `DONE` | Preferencia persistente + SO detect; tokens del design system. |
| Tema — paleta cálida NOE | `DONE` | `<ThemeProvider app="noe">` (primary `#0369A1`, fondos crema), headers de sección y tarjetas con sombra, iconos tipados. |
| `profiles.block_installs` | `DONE` | Flag persistido; consumo en ARCA KIDS vía comando `UNINSTALL_LOCK`. |

## ARCA KIDS (app de hijos, `com.arcakids.child`)

| Feature | Estado | Notas |
|---|---|---|
| Onboarding (nombre + buddy) | `DONE` | Identidad local `features/identity`. |
| Vinculación por código/QR | `DONE` | Código 6 char + QR `akv1:` (ECC H); `redeem_pairing_code`; extras de provisioning persistidos. |
| Theme + i18n | `DONE` | Claves `arcakids.*`, dark mode. |
| Pantalla bloqueada | `DONE` | Rutas `/blocked` + redirect por estado. |
| Internet Seguro (filtro web VPN) | `DONE` | `VpnFilterService` (DNS) + toggle en Ajustes con flujo de consentimiento VPN; reglas desde `web_filters`. |
| Alarma sonora en silencio | `DONE` | `BlockAlarm` suena por `STREAM_ALARM` cuando se bloquea una app o el dispositivo en modo silencio. |
| Realtime enforcement | `PARTIAL` | `subscribeToPolicy` (JS) refresca `updateEnforcementState`; el FGS lee reglas remotas vía RPC anónimo cada 60 s. Falta el push realtime nativo. |

### Capa nativa Android (`com.arcakids.child`)

| Módulo Kotlin | Estado | Notas |
|---|---|---|
| `DeviceOwnerModule` | `DONE` | `getName()="DeviceOwner"` ✓ conectado con `NativeModules.DeviceOwner`. DPM: suspender paquetes, restrictions, wipe, lock, provisioning extras. Verificación de permisos (overlay). |
| `ParentalUsageModule` | `DONE` | `getName()="ParentalUsage"` ✓. UsageStats del día, apps instaladas, `launchApp`, `updateEnforcementState`, `updateBlockedPackages`, `updateDeviceState`, `start/stopEnforcement`, `configureUsageReporter` (para el FGS en background). |
| `ParentalLocationModule` | `DONE` | `getName()="ParentalLocation"` ✓. Tracking, geofences (HAVERSINE), monitoreo. |
| `EnforcementService` (FGS) | `DONE` | START_STICKY, canal de notificación, persistencia, re-aplica en `onStartCommand`. Dependía del poller JS para refrescar reglas; se añade fetch de política remota (RPC anónimo) para autonomía. |
| `BlockingOverlayManager` | `PARTIAL` | Overlay fallback (detección de foreground por UsageEvents/`runningAppProcesses`). Se sustituye como fallback primario por el `AccessibilityService` real. |
| `AccessibilityEnforcementService` | `DONE` | Accesibilidad real: cuando una app bloqueada pasa a primer plano, ejecuta acción global de retorno + notifica. Prominent disclosure y consentimiento explícito en onboarding. |
| `VpnFilterService` (VPN web filter) | `DONE` | `VpnService` DNS (UDP 53): filtra por categorías `web_filters` + sitios manuales y reporta `web_visits`; consentimiento VPN (autoconcedido en device owner u on-demand). |
| `AppControl` (DPM suspend/restrictions) | `DONE` | Requiere Device Owner. |
| `ProvisioningHandler` / `DeviceAdminReceiver` | `DONE` | Deep link QR + admin receiver en manifiesto. |
| Registro y manifiesto | `DONE` | `ArcakidsPackage` + `MainApplication` + `AndroidManifest` (services specialUse + accessibility + receiver). |
| Config plugin `with-device-owner.js` | `DONE` | Regenera la capa nativa en `expo prebuild` (idempotente; lee los `.kt` versionados si existen y cae a plantillas si no). |

### JS bridges / servicios ARCA KIDS

| Feature | Estado | Notas |
|---|---|---|
| `device-owner-module.ts` | `DONE` | Interfaz alineada con `DeviceOwner`: getters, DPM, lock/strict, cams, hide, uninstall lock, force stop, listado. |
| `parental-bridge.ts` | `DONE` | Métodos alineados con `ParentalUsage`. |
| `location-module.ts` | `DONE` | Alineado con `ParentalLocation`. |
| `location-service.ts` | `PARTIAL` | `loadGeofences()` stub (MOCK); polling JS 15 s + nativo 15 s (batería). |
| `use-device-poller` (15 s) | `DONE` | Escribe `updateEnforcementState`; se suma suscripción realtime de `device_policies`. |
| `remote-control-runner` | `DONE` | Realtime de comandos (`device_command_events`) + RPC polling de respaldo. |
| `notification-service` | `DONE` | Permisos, token Expo push, schedule local. |
| `use-achievements` | `BACKEND_ONLY` | Pendiente consumir `get_child_achievements_for_device`. |

## Backend compartido (Supabase, `jvxeiexsmnoorhhphjld`)

| Área | Estado | Notas |
|---|---|---|
| Schema + RLS | `DONE` | RLS en tablas; políticas por familia. `api_throttle` **con RLS activado** (2026-09-17) — sin `FORCE` para no romper `throttle()` (SECURITY DEFINER). |
| RPCs por dispositivo (anon) | `DONE` | get_child_rules, get_device_state, report_usage, ack/commands, ubicación, achievements. Acceso autorreal por `device_uuid`. |
| Rate limit server-side | `DONE` | `api_throttle`+`throttle()`, lock de códigos (10 fallos→10 min), Edge Function `redeem-pair` (throttle durable por IP+device). |
| Realtime command queue | `DONE` | `device_commands`/`device_command_events` (broadcast) + `device_policies`; consumido por `remote-control-runner`. |
| `offline_actions` | `MISSING` | Sync engine desde cero (P8). |
| `web_filtering` enforcement | `DONE` | VPN DNS (UDP 53) en ARCA KIDS; reglas desde `web_filters` (RPC `get_web_filter_rules_for_device`) y reporte de visitas a `web_visits` (`report_web_visit`). |
| `achievements` consumidos | `BACKEND_ONLY` | Tabla + RPCs listos; sin consumo en la app. |
| **Deuda de seguridad aceptada** | `INFO/WARN` | `rls_enabled_no_policy` en `api_throttle` (intencionado: solo SECURITY DEFINER/service_role leen); `pg_net` en `public`; RPCs SECURITY DEFINER por diseño (parametrizados por `device_uuid`); leaked-password protection deshabilitada (conectar HaveIBeenPwned antes de producción). |

## Mapa de nombres — prompt Fase 1 ↔ implementación real

| Nombre (prompt) | Implementación real | Clasificación |
|---|---|---|
| `isDeviceOwner` / `isAdminActive` | `DeviceOwnerModule.isDeviceOwner` / `isAdminActive` | `DONE` |
| `getTodayUsage` | `ParentalUsageModule.getUsageTodayMinutes` (+ alias `getTodayUsage`) | `PARTIAL` → `DONE` |
| `getAppUsage(pkg)` | `ParentalUsageModule.getAppUsage` (minutos por app hoy) | `DONE` |
| `getLaunchableApps` | `ParentalUsageModule.getLaunchableApps` | `DONE` |
| `launchApp` | `ParentalUsageModule.launchApp` | `DONE` |
| `blockApp` / `isAppBlocked` | `DeviceOwnerModule.blockPackage` / `isPackageSuspended` (DPM suspend) + aliases; fallback non-owner: `AccessibilityEnforcementService` | `PARTIAL` → `DONE` |
| `updateEnforcement` | `ParentalUsageModule.updateEnforcementState` (+ alias `updateEnforcement`) | `PARTIAL` → `DONE` |
| FGS de enforcement | `EnforcementService` (START_STICKY + notify + persiste) | `DONE` |
| Restaurar tras reboot | `BootReceiver` (BOOT_COMPLETED / MY_PACKAGE_REPLACED) | `DONE` |
| Sync Supabase por `family_id` | Realtime `device_policies` por `device_uuid` (filtro RLS por familia) + RPC `get_child_rules_for_device` | `PARTIAL` → `DONE` |

## Verificación

- `npm run typecheck` / `npm run lint` / `npm test`: 0 errores.
- APKs debug de ambas apps → `builds/{noe,arcakids}/` (gitignored), con versión en el nombre.
- Release firmado (`assembleRelease` local) usa `release.keystore` gitignored.
- Workspace Android Studio: abrir `android/` (composite build) → `:noe:app:assembleDebug`, `:arcakids:app:assembleRelease`.