# Architecture

NOE + ARCA KIDS is a parental control system made of two independent Android apps sharing one Supabase backend, built as an npm-workspaces monorepo.

## Repo layout

```
/                 npm workspaces root (private)
├── apps/noe/         NOE - parent app          (com.noe.parent)
├── apps/arcakids/    ARCA KIDS - child app     (com.arcakids.child)
├── packages/types/   shared domain TypeScript types
├── packages/shared/  pure utilities, validators, errors, logger, design tokens
├── packages/config/  environment, app info, feature flags
├── packages/storage/ local storage abstraction (AsyncStorage implementation)
├── packages/supabase/ shared Supabase client + auth helpers
├── supabase/         Supabase CLI project (config.toml, migrations, seed)
├── scripts/          reserved for repo scripts (root npm scripts are the entry points)
└── docs/             documentation
```

## Two apps, one backend

- Both apps are full Expo (React Native + TypeScript) projects with their own APK.
- Both use the `@noe-arcakids/supabase` package - Supabase configuration is never duplicated.
- Safe-area, splash, env separation and base navigation are set up per app.

## Layering rule

Screens never talk to Supabase directly. The flow is always:

```
Screen -> Hook -> Service -> Repository -> data source (Supabase / local storage)
```

- `features/<feature>/services/` - use cases, input validation, error mapping
- `features/<feature>/repositories/` - data access (SQL, API, storage)
- `stores/` - Zustand stores, split by domain (auth, connection, family, children, local)
- `services/` - app-wide infrastructure (NetworkService, SyncService interface)

## Online / offline foundation

- `Supabase` is the remote source of truth.
- `packages/storage` is the local cache / local state layer.
- `NetworkService` + `useNetworkStatus()` expose connectivity to React.
- `SyncService` defines the interface (`sync`, `queue`, `flush`, `isOnline`) for the future sync engine. The engine itself is NOT implemented in this phase.

## Auth & identity

- NOE (parent): email + password, password recovery, persistent session (Supabase auth with AsyncStorage persistence).
- ARCA KIDS (child): no auth mechanism assumed yet. `features/identity` exposes service/repository stubs to be completed when the linking strategy is defined (Phase 3).

## State

Zustand stores, one per domain (never one giant store): `auth-store` (NOE), `connection-store` (both apps), plus future family/children/local stores.

## Errors & logging

- Error hierarchy (`AppError` + NetworkError, AuthError, DatabaseError, ValidationError, UnknownError) lives in `packages/shared`; screens only render mapped messages.
- `Logger` (`debug/info/warn/error`) is centralized in `packages/shared`; level is reduced in production.

## Security rules enforced in this phase

- No secrets in source code; only `EXPO_PUBLIC_*` anon/public values via env vars (never the service role key).
- RLS enabled on every table; read policies scoped to the caller's family.
- Client-side validation is never trusted on its own (enforced server side in later phases).

## Design system

Design tokens (colors, spacing, radius, typography) live in `packages/shared/theme.ts`. UI primitives (Button, Input, Card, PlaceholderScreen) live per app under `src/components/` and consume the tokens, so visual changes touch tokens first.