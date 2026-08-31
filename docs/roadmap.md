# Roadmap

| Phase | Scope | Status |
|---|---|---|
| FASE 0 | Base architecture: monorepo, two independent Expo apps, shared packages, Supabase base + RLS, online/offline foundation, base navigation, functioning debug APKs | [COMPLETADA] |
| FASE 1 | NOE (parent app): full auth UX, family setup, children management screens | [COMPLETADA] |
| FASE 2 | ARCA KIDS (child app): kid experience, onboarding flow shape, activity views | [COMPLETADA] |
| FASE 3 | Vinculacion: device/child linking via 6-digit pairing code + QR, redeemed anonymously by ARCA KIDS (one-shot, 10 min expiry) | [COMPLETADA] |
| — | i18n transversal: espanol por defecto + ingles, deteccion del idioma del SO, selector manual persistente en Settings (ambas apps) | [COMPLETADA] |
| FASE 4 | Control parental: app control/locks, time limits, usage sessions | [EN PROGRESO — 4 FIRST RUN del backend + NOE (schema, RLS, RPCs, Rules NOE, app categories, unlock requests, dashboard NOE) COMPLETADA. PARTE NATIVA ANDROID DE ARCA KIDS PENDIENTE: el roadmap previo declaraba "módulo nativo UsageStats, launcher grid, EnforcementService FGS" como completados, pero la capa nativa real solo implementa `isDeviceOwner`/`isAdminActive`. Falta por implementar: modulo `ParentalUsage` (UsageStats), `EnforcementService` (FGS), launcher grid nativo, bloqueo de apps con fallback Device Owner + Accessibility Service, y el cableado del loop de comandos Realtime. Ver FASE C del plan de implementacion.] |
| FASE 5 | Geolocalizacion y geocercas | [PENDIENTE — Backend de la tabla `geofences` creado; servicio JS y nativo `ParentalLocation` PENDIENTE en ARCA KIDS] |
| FASE 6 | Notificaciones, pasos, gamificacion, modo estudio | [PENDIENTE — Tabla `push_tokens`/`unlock_requests` y services existen pero la UI/backend push no estan conectados; modo estudio solo local] |
| FASE 7 | Permisos avanzados, servicios Android en segundo plano, foreground services, overlays | [PENDIENTE — Depende de la capa nativa de la FASE 4] |
| FASE 8 | Sync engine completo (offline queue -> Supabase), realtime, Edge Functions, storage | [PENDIENTE — Existe un `offline-sync-engine.ts` esqueleto en ARCA KIDS que apunta a una tabla `offline_actions` NO migrada y que contradice `FEATURE_FLAGS.syncEngine: false`; se descarta/retoma en esta fase] |

## Rules

- Features are specified by the owner phase by phase; nothing is implemented ahead of its phase.
- Every phase ends with: typecheck, lint, Expo validation and Android builds passing.
- Nothing is declared done unless it compiles and is verifiable.

## Known warnings (accepted by design)

- `expo-doctor` reports 20/21 in both apps: the "app config fields not synced in a non-CNG project" check is expected because `android/` folders are committed on purpose (prebuilt projects) while `app.config.ts` keeps native properties for CNG. Keep `android/` in sync by running `npx expo prebuild --no-install` before builds and whenever app.config changes.