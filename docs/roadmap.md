# Roadmap

| Phase | Scope | Status |
|---|---|---|
| FASE 0 | Base architecture: monorepo, two independent Expo apps, shared packages, Supabase base + RLS, online/offline foundation, base navigation, functioning debug APKs | [COMPLETADA] |
| FASE 1 | NOE (parent app): full auth UX, family setup, children management screens | [COMPLETADA] |
| FASE 2 | ARCA KIDS (child app): kid experience, onboarding flow shape, activity views | [COMPLETADA] |
| FASE 3 | Vinculacion: device/child linking via 6-digit pairing code + QR, redeemed anonymously by ARCA KIDS (one-shot, 10 min expiry) | [COMPLETADA] |
| — | i18n transversal: espanol por defecto + ingles, deteccion del idioma del SO, selector manual persistente en Settings (ambas apps) | [COMPLETADA] |
| FASE 4 | Control parental: app control/locks, time limits, usage sessions | [EN PROGRESO — Backend (schema, RLS, RPCs, reglas NOE, categorías, unlock requests, dashboard) y NOE COMPLETADOS. La capa nativa ARCA KIDS está implementada y registrada (UsageStats, EnforcementService FGS, overlay, location, DeviceOwner) con un bug de nombre de módulo ya corregido en P1.1 (2026-09-02). Pendiente: autosuficiencia del FGS (backoff), overlay interactivo, reporte de uso más granular y launcher con iconos. Ver `docs/implementation-status.md`. NOTA: versión previa de este roadmap afirmaba que el nativo solo tenía `isDeviceOwner`/`isAdminActive`; era incorrecto. No tratar esta sección como hoja de ruta actual — usar `docs/implementation-status.md`.] |
| FASE 5 | Geolocalizacion y geocercas | [EN PROGRESO — Backend `geofences` + RPC listos; NOE CRUD DONE; ARCA KIDS: módulo nativo `ParentalLocation` DONE, pero `location-service.ts` tiene stubs/TODOs (persistencia local, `loadGeofences` stub) y polling 15s a revisar] |
| FASE 6 | Notificaciones, pasos, gamificacion, modo estudio | [EN PROGRESO — `push_tokens`/`unlock_requests`/`notification_preferences` en backend + services; las preferencias aún no se consumen en runtime; modo estudio solo local; gamificación pendiente (tabla `achievements` no existe)] |
| FASE 7 | Permisos avanzados, servicios Android en segundo plano, foreground services, overlays | [EN PROGRESO — FGS + overlay ya existen y compilan (FASE 4 nativa); falta robustez (detección foreground, overlay interactivo)] |
| FASE 8 | Sync engine completo (offline queue -> Supabase), realtime, Edge Functions, storage | [PENDIENTE — El esqueleto `offline-sync-engine.ts` ya fue eliminado y el flag `FEATURE_FLAGS.syncEngine` removido (código muerto). El sync engine se implementará desde cero en esta fase contra una migración real `offline_actions`] |

## Rules

- Features are specified by the owner phase by phase; nothing is implemented ahead of its phase.
- Every phase ends with: typecheck, lint, Expo validation and Android builds passing.
- Nothing is declared done unless it compiles and is verifiable.

## Known warnings (accepted by design)

- `expo-doctor` reports 20/21 in both apps: the "app config fields not synced in a non-CNG project" check is expected because `android/` folders are committed on purpose (prebuilt projects) while `app.config.ts` keeps native properties for CNG. Keep `android/` in sync by running `npx expo prebuild --no-install` before builds and whenever app.config changes.