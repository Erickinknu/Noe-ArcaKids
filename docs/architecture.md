# Architecture (detailed)

See `ARCHITECTURE.md` for the summary. This page documents the conventions in depth.

## Dependency direction

```
apps/noe        apps/arcakids
      \            /
       \          /
  packages/supabase   packages/storage
        |                   |
  packages/config <--- packages/shared (validators, errors, logger, theme)
        |
  packages/types
```

- `packages/shared` and `packages/types` are pure TypeScript with no native/runtime dependencies beyond what their consumers bring.
- `packages/config` reads `EXPO_PUBLIC_*` vars (inlined by Expo at build time) and owns app info + feature flags.
- `packages/supabase` owns the single client instance, auth persistence (AsyncStorage), and auth helpers with error mapping.
- Apps hold UI, routing, stores, and feature services/repositories.

## Feature conventions

Each feature lives in `apps/<app>/src/features/<feature>/`:

```
features/<feature>/
├── services/       use cases (validate, orchestrate, map errors)
└── repositories/   data access against packages (Supabase client, local storage)
```

Example: `features/children/` -> `childService.listChildren(familyId)` -> `childRepository.listChildren(familyId)` -> Supabase query.

## Stores

Zustand stores live in `apps/<app>/src/stores/`, one per domain:

- `auth-store` (NOE): status (`initializing | authenticated | unauthenticated`), session, user; wired to Supabase auth state changes.
- `connection-store` (both): online status fed by `NetworkService`.

## Online / offline

- `NetworkService` (per app) subscribes to NetInfo and writes to `connection-store`.
- `useNetworkStatus()` exposes `{ isOnline, isInternetReachable }` to React.
- `SyncService` is an interface (`queue`, `flush`, `sync`, `isOnline`). Current implementation logs only; the sync engine comes in a later phase.
- Rule: remote = truth, local = cache. Never mix the two meanings.

## Errors

All screens do:

```ts
try { await service.operation() } catch (cause) {
  setError(cause instanceof AppError ? cause.message : 'Unexpected error.');
}
```

Infrastructure details (status codes, network stack) are mapped inside packages/services and never surfaced as-is.

## Adding a new screen

1. Create the route under `apps/<app>/app/`.
2. Create the feature service/repository under `src/features/`.
3. Only consume services (never the Supabase client) from the screen.
4. Run `npm run typecheck && npm run lint` from the repo root.