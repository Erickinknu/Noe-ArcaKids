# Roadmap

| Phase | Scope | Status |
|---|---|---|
| FASE 0 | Base architecture: monorepo, two independent Expo apps, shared packages, Supabase base + RLS, online/offline foundation, base navigation, functioning debug APKs | [COMPLETADA] |
| FASE 1 | NOE (parent app): full auth UX, family setup, children management screens | [COMPLETADA] |
| FASE 2 | ARCA KIDS (child app): kid experience, onboarding flow shape, activity views | [COMPLETADA] |
| FASE 3 | Vinculacion: device/child linking via 6-digit pairing code + QR, redeemed anonymously by ARCA KIDS (one-shot, 10 min expiry) | [COMPLETADA] |
| — | i18n transversal: espanol por defecto + ingles, deteccion del idioma del SO, selector manual persistente en Settings (ambas apps) | [COMPLETADA] |
| FASE 4 | Control parental: app control/locks, time limits, usage sessions | [PENDIENTE] |
| FASE 5 | Geolocalizacion y geocercas | [PENDIENTE] |
| FASE 6 | Notificaciones, pasos, gamificacion, modo estudio | [PENDIENTE] |
| FASE 7 | Permisos avanzados, servicios Android en segundo plano, foreground services, overlays | [PENDIENTE] |
| FASE 8 | Sync engine completo (offline queue -> Supabase), realtime, Edge Functions, storage | [PENDIENTE] |

## Rules

- Features are specified by the owner phase by phase; nothing is implemented ahead of its phase.
- Every phase ends with: typecheck, lint, Expo validation and Android builds passing.
- Nothing is declared done unless it compiles and is verifiable.

## Known warnings (accepted by design)

- `expo-doctor` reports 20/21 in both apps: the "app config fields not synced in a non-CNG project" check is expected because `android/` folders are committed on purpose (prebuilt projects) while `app.config.ts` keeps native properties for CNG. Keep `android/` in sync by running `npx expo prebuild --no-install` before builds and whenever app.config changes.