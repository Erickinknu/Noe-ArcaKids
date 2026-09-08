# Changelog

All notable changes to the `noe-arcakids` monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.1] - 2026-09-08

### Added
- **El control sobrevive al reinicio**: nuevo `BootReceiver` con
  `RECEIVE_BOOT_COMPLETED` que reinicia `EnforcementService` tras el arranque
  del dispositivo y tras una actualización de la app (`MY_PACKAGE_REPLACED`).
  Si el dispositivo estaba bloqueado o con reglas activas, se vuelven a aplicar
  al encender sin necesidad de abrir ARCA KIDS.
- **Anti-desactivación**: `DeviceAdminReceiver.onDisableRequested` devuelve
  `""` para rechazar la desactivación del administrador desde Ajustes, de modo
  que el hijo no pueda desactivar el control parental manualmente.

### Changed
- **Versión 1.3.1 (versionCode 6)** en NOE y ARCA KIDS: `package.json`,
  `app.config.ts`, `android/app/build.gradle`, `APP_VERSION` del monorepo,
  lockfile y este changelog.

## [1.3.0] - 2026-09-07

### Added
- **Provisionamiento real como Device Owner (DPC)**:
  - Nueva actividad `DisposableProvisioningActivity` (`ACTION_PROVISION_MANAGED_DEVICE`)
    que, durante la configuración de Android, lee `EXTRA_PROVISIONING_ADMIN_EXTRAS_BUNDLE`
    y persiste `familyId`/`childId`/`pairingCode` en ARCA KIDS para autovincularse al primer arranque.
  - Toggle "QR app / QR del asistente (Device Owner)" en NOE → Vincular: el QR DPC codifica
    las claves `android.app.extra.*` (admin component + bundle). Sin el Device Owner, todos los
    poderes DPM (suspensión, lock task, etc.) fallan silenciosamente con `ERR_NOT_OWNER`.
- **Fix del bloqueo que "no se sostenía"**:
  - El poller ya no pisa la bandera `device_state.is_blocked` con el enforcement de reglas
    (antes escribía emergencia y la sobreescribía con `enforce=false` cada 15s).
  - `EnforcementService` lee `is_blocked` como candado total autoritativo → suspende todas las
    apps (incluido el launcher) si es Device Owner, o muestra un overlay de pantalla completa no
    desmontable si no lo es.
  - `LOCK`/`UNLOCK` desde NOE ahora ejecutan lock-task (kiosco) en modo Owner y además el
    dashboard (Blocar/Desbloquear) encola el comando para que el dispositivo reaccione al instante.
- **Overlay de fallback usable**: paso de permisos en el onboarding de ARCA KIDS (acceso a uso +
  superposición), fila "Modo del dispositivo" y "Permiso de superposición" en Ajustes con acceso
  directo a los ajustes del sistema.

### Changed
- **Versión 1.3.0 (versionCode 5)** en NOE y ARCA KIDS: `package.json`,
  `app.config.ts`, `android/app/build.gradle`, `APP_VERSION` del monorepo,
  lockfile y este changelog.

## [1.2.1] - 2026-09-07

### Changed
- **Fix del vínculo NOE → ARCA KIDS**: el código de emparejamiento y el QR ya se
  generan en el APK release (Hermes no implementa `globalThis.crypto`; ahora se
  usa `expo-crypto`). Además, los errores genéricos ya muestran su mensaje real
  en la UI (antes caían en "ha ocurrido un error inesperado").
- **Versión 1.2.1 (versionCode 4)** en NOE y ARCA KIDS: `package.json`,
  `app.config.ts`, `android/app/build.gradle`, `APP_VERSION` del monorepo,
  lockfile y este changelog.

## [1.2.0] - 2026-09-05

### Added
- **ARCA KIDS control total desde la raíz (Device Owner)**:
  - Nuevos poderes DPM en el módulo nativo `DeviceOwner`: lock-task/kiosco
    (`start/stopLockTask` + `setLockTaskPackages`), `setScreenCaptureDisabled`,
    `setCameraDisabled`, `setApplicationHidden`, `setUninstallBlocked`,
    `forceStopPackage` y `getInstalledApps`.
  - Nuevos comandos remotos `NOE → ARCA KIDS`: `LOCK_TASK`, `UNLOCK_TASK`,
    `SCREEN_CAPTURE`, `CAMERA`, `HIDE_APPS`, `UNHIDE_APPS`, `UNINSTALL_LOCK`,
    `FORCE_STOP`, `WIPE_DEVICE` y `LIST_APPS` (catálogo extendido en
    `device_commands` y en `enqueue_device_command`).
  - El canal realtime ahora funciona de verdad: nueva tabla broadcast
    `device_command_events` (sin RLS, grant-only SELECT a `anon`) alimentada por
    un trigger sobre `device_commands`, con la suscripción `postgres_changes`
    filtrada por `device_uuid`; antes el suscriptor `anon` no recibía eventos
    porque `device_commands` mantiene RLS cerrada.
  - `remote-control-runner`: suscripción realtime + polling de comandos
    pendientes cada 20s + resync al volver a primer plano, con dedupe por id
    de comando; arranca en `_layout` de ARCA KIDS.
  - `REQUEST_LOCATION` deja de ser stub: obtiene GPS real (`locationModule`) y
    lo reporta a `device_status`.
  - `LIST_APPS`: el dispositivo reporta sus apps instaladas a `device_status.apps`.
- **NOE panel "Controles de raíz"** en la ficha del hijo: toggles de modo kiosco,
  bloqueo de capturas, bloqueo de cámara y bloqueo de instalar/desinstalar
  (restricciones `DISALLOW_INSTALL_APPS`/`DISALLOW_UNINSTALL_APPS`), carga de la
  lista de apps instaladas con selección múltiple (bloquear / desbloquear /
  forzar cierre / ocultar) y botón "Borrar dispositivo" (wipe remoto) con
  confirmación. `RUN_BORRAR` vía `enqueue_device_command` `'WIPE_DEVICE'`.

### Changed
- **Versión 1.2.0 (versionCode 3)** en NOE y ARCA KIDS: `package.json`,
  `app.config.ts`, `android/app/build.gradle`, `APP_VERSION` del monorepo,
  lockfile y este changelog.

### Notes
- Las funciones de raíz (`setScreenCaptureDisabled`, `setCameraDisabled`,
  `setApplicationHidden`, kiosco, wipe, etc.) se ejecutan únicamente cuando
  ARCA KIDS es **Device Owner** del dispositivo (provisionable desde NOE vía el
  QR de provisioning). Sin Device Owner, los comandos de bloqueo/reglas siguen
  funcionando vía `EnforcementService` (overlay + polling).

## [1.1.0] - 2026-09-05

### Added
- **NOE vinculación accesible**: tarjeta **"Vincular dispositivo"** en la sección Familia (tab Otros)
  y tarjeta **"Vincular un dispositivo"** en el Dashboard (Inicio) que navegan a la pantalla de
  vinculación (`/linking`) con código de 8 caracteres, QR de provisioning (Device Owner) y vencimiento.
- **NOE flujo sin hijos**: el `EmptyState` de la pantalla de vinculación gana el botón
  "Ir a la sección Hijos" (`noe.linking.goToChildren`, es/en).

### Changed
- **Versión 1.1.0 (versionCode 2)** en NOE y ARCA KIDS: `package.json`, `app.config.ts`,
  `android/app/build.gradle`, `APP_VERSION` del monorepo y este changelog.

## [1.0.0] - 2026-09-04

### Added
- **`@noe-arcakids/config`: `APP_VERSION` unificado a `1.0.0`** (antes `0.1.0.12`), alineado con
  `version`/`versionName` de `app.config.ts` y `build.gradle` (v1.0.0).
- **NOE desbloqueo biométrico**: nuevo `biometric-service` (`expo-local-authentication`), toggle en
  `Configuración de la app → Seguridad` (exige PIN previo y biometría disponible) y botón de huella
  en el gate de apertura con PIN.
- **NOE estados vacíos**: las acciones rápidas del Dashboard se deshabilitan cuando no hay hijos
  registrados; Actividad/Control/Familia muestran CTA para registrar un hijo.

### Changed
- **NOE `getMyFamily`**: filtra `profiles` por `user_id = user.id` (antes devolvía un perfil arbitrario).
- **NOE Dashboard abierto al inicio**: `initialRouteName="index"` — al abrir la app se muestra el
  tab Inicio.
- **Refresco por foco**: Actividad y Familia recargan con `useFocusEffect` al volver a la pestaña.
- **ARCA KIDS Home**: tarjetas navegables (Pressable dentro de `Link asChild`) — antes eran muertas.
- **ARCA KIDS onboarding**: flujo solo con código de familia obligatorio (teclear o QR); sin pasos
  de nombre/avatar; si el código no vincula, no avanza.
- **Modo oscuro**: el contenedor raíz pinta `colors.background` y `Appearance.setColorScheme()`
  fuerza el esquema nativo según el tema elegido (termina con mezcla blanco/oscuro en pestañas).
- **Base de datos**: se eliminaron todos los registros de hijos y datos derivados (DB en blanco).

### Notes
- La base de datos quedó con 0 hijos: cada familia debe ingresar sus hijos desde NOE (tab Hijos)
  para activar el control; ARCA KIDS solo puede vincularse cuando existe un hijo y un código vigente.

## [housekeeping] - 2026-08-28 (Fase A - base deuda/limpieza)

### Added
- **`@noe-arcakids/config` ahora lo consume NOE**: `APP_VERSION` se usa en `profile/index.tsx` y
  `profile/config.tsx`, eliminando la versión hardcodeada (`0.1.0.7`) que estaba desalineada con el
  monorepo (`0.1.0.12`). `APP_VERSION` actualizado a `0.1.0.12`.

### Changed
- **Documentación alineada con el estado real**:
  - `docs/roadmap.md`: FASE 4 corregida — la parte nativa Android de ARCA KIDS (UsageStats,
    EnforcementService, launcher grid, bloqueo, cableado Realtime) ya NO se declara completada;
    solo el backend + NOE están completos. Se marca explícitamente lo que falta. FASE 8 documenta
    que el sync engine es esqueleto contra una tabla no migrada.
  - `README.md`: status corregido de "Phase 0" a "Phase 4 en progreso", aclarando el estado de la
    capa nativa de ARCA KIDS.
  - `ARCHITECTURE.md`: nueva sección "ARCA KIDS native Android layer (status)" documentando que la
    capa nativa es mínima (solo `isDeviceOwner`/`isAdminActive`).
- **NOE theme-provider usa el wrapper `@noe-arcakids/storage`** en lugar de `AsyncStorage` a
  directamente, unificando la abstracción de almacenamiento (clave persistente sin cambios:
  `@noe-arcakids/noe/app/theme`).

### Removed
- **`packages/shared/src/constants.ts`**: dead code (`STORAGE_PREFIX` no exportado en el barrel y
  duplicado en `packages/storage/src/async-storage.ts`).
- **`apps/arcakids/src/features/offline/`**: `OfflineSyncEngine` era un esqueleto roto — apuntaba a
  una tabla `offline_actions` inexistente en migraciones, importaba servicios que no existen
  (`parentalService`/`geofenceRepository`), y construía un singleton con side effects
  (`setInterval` + listener de red) que contradice `FEATURE_FLAGS.syncEngine: false` en
  `@noe-arcakids/config`. Jamás se importaba desde el runtime. Se retomará en la FASE 8 (sync engine)
  contra una migración real.

### Security
- Sin cambios de seguridad.

## [0.2.0] - 2026-08-24

### Added
- **ParentalServiceBridge**: Interfaz unificada `ParentalBridge` para el módulo nativo Android con `Platform.OS === 'android'` guard y mocks limpios para entornos no-Android, facilitando la futura implementación en iOS
- **Auth guard en `(app)/_layout.tsx`**: Redirección automática de usuarios no autenticados a la pantalla de login
- **Rutas `linking` y `settings` registradas como tabs**: Antes eran rutas huérfanas sin navegación accesible
- **ChildCard extraído a componente separado**: `apps/noe/src/components/ui/child-card.tsx` (423 líneas movidas del Dashboard)
- **Rules split en RulesForm + BlockedAppsSection**: `apps/noe/src/components/ui/rules-form.tsx` y `apps/noe/src/components/ui/blocked-apps-section.tsx`, con `rules/index.tsx` como orquestador
- **WeeklyChart extraído de Activity**: `apps/noe/src/components/ui/weekly-chart.tsx`, usado por `apps/noe/app/(app)/activity/index.tsx`
- **Error handling uniforme**: Todas las pantallas de auth (`login.tsx`, `register.tsx`, `forgot-password.tsx`) ahora usan `errorMessage()` en lugar de `instanceof AppError` inline
- **Profile usa ErrorState**: `apps/noe/app/(app)/profile/index.tsx` ahora muestra `<ErrorState>` en lugar de `<Text style={styles.error}>`
- **Notifications fix**: `useState(() => { loadPrefs() })` → `useEffect(() => { loadPrefs() }, [])` — evita ejecutar side effects en phase de render
- **[childId] screen**: Eliminada magic string `'__current__'`, ahora usa `familyService.getMyFamily()` + `childService.listChildren(family.id)` para obtener la familia real
- **Dashboard repository**: Ya no devuelve `MOCK_FAMILY_SUMMARY` en catch blocks — los errores reales propagan para que la UI muestre `<ErrorState>` auténtico
- **Rules pull-to-refresh**: Ahora `await reload()` en lugar de `setTimeout(500ms)` — el spinner se sincroniza con la carga real de datos
- **Activity loading flash**: `if (loading && !usageData && !alerts)` — no muestra LoadingState si ya hay datos cargados
- **Dashboard refactor**: `fetchData`/`handleRefresh` unificados en una sola función con parámetro `isRefresh`; error handling usando `errorMessage()` en vez de tragar el mensaje
- **Connection store defaults**: `isOnline` cambia de `true` a `false` antes de la inicialización — evita falsos positivos de "online" antes de que NetInfo haya reportado el estado
- **Network service**: Migración a `@noe-arcakids/shared` con `start()`/`stop()` lifecycle y manejo adecuado de `unsubscribe`
- **UseAsyncData cancellation**: Bandera `cancelledRef` para cancelar promesas en unmount — previene memory leaks y state updates en componentes desmontados

### Changed
- **Código duplicado extraído a `@noe-arcakids/shared`**: 5 archivos idénticos entre apps migrados:
  - `hooks/use-async-data.ts` (con fix de cancellation en unmount)
  - `hooks/use-network-status.ts`
  - `stores/connection-store.ts` (defaults `isOnline: false`)
  - `services/network-service.ts`
  - `services/sync-service.ts` — eliminado (stub sin implementar, nunca importado)
- **Parental bridge**: `usageModule.*` → `parentalBridge.*` en 4 archivos arcakids (`use-parental-status.ts`, `parental-service.ts`, `settings/index.tsx`, `launcher/index.tsx`)
- **Auth store lifecycle**: `onAuthStateChange` subscription ahora se almacena y desuscribe correctamente; previene doble-init
- **Expo Router**: Auth guard activo en `(app)/_layout.tsx`; tabs `linking` y `settings` registrados; root `app/index.tsx` con redirect condicional por status
- **Módulo nativo unificado**: `parental-bridge.ts` con interfaz `ParentalBridge`, guards `Platform.OS === 'android'`, y throw de error en entornos no-Android en vez de silenciar
- **@noe-arcakids/shared**: Superficie reducida — removidos 15 exports huérfanos (`getColors`, `getShadows`, `useThemeColors`, `useThemeShadows`, `ColorScheme`, `setLogLevel`, `LogLevel`, `toAppError`, etc.)
- **@noe-arcakids/types**: Removidos 7 tipos no utilizados (`Device`, `Session`, `UsageScheduleKind`, `UsageSchedule`, `UsageReport`, `DevicePlatform`, `Role`)
- **@noe-arcakids/supabase**: Removido `getSupabaseClient()` — solo queda `requireSupabaseClient()`
- **@noe-arcakids/errors**: Simplificado — removido `AppErrorOptions` y `toAppError()`
- **@noe-arcakids/logger**: `LogLevel` y `setLogLevel` ahora son tipos/funciones privadas (no exportados)
- **@noe-arcakids/storage**: Archivo `storage.ts` mergeado en `async-storage.ts`; solo se exporta `storage` (singleton); `buildKey` y `StorageError` removidos de la superficie pública
- **@noe-arcakids/config**: Removido de ambas apps (no importado por ninguna pantalla/componente)
- **Monorepo dependencies**: `@react-native-community/netinfo` y `zustand` movidos de apps a `packages/shared`; `@noe-arcakids/config` removido de ambas apps

### Removed
- **UI components huérfanos**: `apps/noe/src/components/ui/icon.tsx`, `section-title.tsx`, `skeleton.tsx`, `screen-container.tsx`, `placeholder-screen.tsx` (×2 para NOE y arcakids)
- **Archivo legacy**: `apps/arcakids/src/features/parental/native/usage-module.ts`
- **Datos mock**: `apps/noe/src/features/dashboard/data/mock-family-summary.ts` y directorio `data/`
- **Archivo sync-service stub**: `apps/noe/src/services/sync-service.ts` y `apps/arcakids/src/services/sync-service.ts`
- **Exports huérfanos de packages**: 
  - `@noe-arcakids/shared`: `getColors`, `getShadows`, `useThemeColors`, `useThemeShadows`, `ColorScheme`, `setLogLevel`, `LogLevel`, `toAppError`
  - `@noe-arcakids/types`: `Device`, `Session`, `UsageScheduleKind`, `UsageSchedule`, `UsageReport`, `DevicePlatform`, `Role`
  - `@noe-arcakids/supabase`: `getSupabaseClient`
  - `@noe-arcakids/shared/errors`: `AppErrorOptions`, `toAppError`
  - `@noe-arcakids/shared/logger`: export público de `setLogLevel` y `LogLevel`

### Fixed
- **Race condition en auth-store**: `onAuthStateChange` listener ahora se almacena y desuscribe al re-inicializar; previene apilamiento de listeners en double-init
- **Bug notifications**: `useState(() => { loadPrefs() })` → `useEffect(() => { loadPrefs() }, [])` — side effects ahora en la fase correcta
- **Bug [childId]**: Magic string `'__current__'` eliminada; ahora resuelve familia real vía `familyService`
- **Bug dashboard mock**: Catch blocks ya no silencian errores con `MOCK_FAMILY_SUMMARY` — errores propagan realment
- **Bug rules refresh**: Pull-to-refresh ahora `await reload()` en vez de `setTimeout(500ms)` — spinner sincronizado
- **Bug activity loading flash**: Condición `if (loading && !usageData && !alerts)` evita flash full-screen cuando ya hay datos
- **Error handling uniforme**: Auth screens usan `errorMessage()` consistente; profile usa `<ErrorState>` en vez de inline `<Text>`
- **TypeScript strictness**: Tipos no utilizados removidos; superficie de exports reducida; `tsc --noEmit` pasa sin errores nuevos

### Security
- Sin cambios de seguridad críticos; el enfoque ha sido en refactorización y eliminación de código muerto manteniendo la misma superficie de API pública donde es posible.