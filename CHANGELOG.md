# Changelog

All notable changes to the `noe-arcakids` monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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