# Roadmap

| Phase | Scope | Status |
|---|---|---|
| FASE 0 | Base architecture: monorepo, two independent Expo apps, shared packages, Supabase base + RLS, online/offline foundation, base navigation, functioning debug APKs | [ACTUAL] |
| FASE 1 | NOE (parent app): full auth UX, family setup, children management screens | [PENDIENTE] |
| FASE 2 | ARCA KIDS (child app): kid experience, onboarding flow shape, activity views | [PENDIENTE] |
| FASE 3 | Vinculacion: device/child linking (anonymous auth, code, QR or device - strategy TBD) | [PENDIENTE] |
| FASE 4 | Control parental: app control/locks, time limits, usage sessions | [PENDIENTE] |
| FASE 5 | Geolocalizacion y geocercas | [PENDIENTE] |
| FASE 6 | Notificaciones, pasos, gamificacion, modo estudio | [PENDIENTE] |
| FASE 7 | Permisos avanzados, servicios Android en segundo plano, foreground services, overlays | [PENDIENTE] |
| FASE 8 | Sync engine completo (offline queue -> Supabase), realtime, Edge Functions, storage | [PENDIENTE] |

## Rules

- Features are specified by the owner phase by phase; nothing is implemented ahead of its phase.
- Every phase ends with: typecheck, lint, Expo validation and Android builds passing.
- Nothing is declared done unless it compiles and is verifiable.