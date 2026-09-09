# Development

## Prerequisites

- Node.js >= 20 (checked against v24)
- npm >= 10 (workspaces)
- JDK 17 for Android builds
- Android SDK + `ANDROID_HOME` set
- Supabase CLI (for database work)
- Git

## Install

```bash
npm install          # installs all workspaces (apps + packages) from the root
```

## Validation commands (repo root)

```bash
npm run typecheck    # tsc --noEmit across all workspaces
npm run lint         # expo lint across the apps
```

Per-app extra checks:

```bash
npx expo-doctor      # run inside apps/noe or apps/arcakids
```

## Running an app

```bash
cd apps/noe          # or apps/arcakids
npm start            # Expo dev server (QR for Expo Go / dev build)
npm run android      # starts expo and opens on an Android emulator/device
```

## Android builds (local APK)

The `android/` folders are generated with `expo prebuild -p android` and committed,
so repeated builds do not regenerate or modify them (builds do not modify source files):

```bash
npm run prebuild:noe       # one-time: (re)generate apps/noe/android
npm run prebuild:arcakids  # one-time: (re)generate apps/arcakids/android
npm run build:noe          # gradlew assembleDebug -> apps/noe/android/app/build/outputs/apk/debug/app-debug.apk
npm run build:arcakids     # gradlew assembleDebug -> apps/arcakids/android/app/build/outputs/apk/debug/app-debug.apk
```

First Gradle run downloads dependencies (1-2 GB) - it takes a while.

Install on a device/emulator:

```bash
adb install apps/noe/android/app/build/outputs/apk/debug/app-debug.apk
adb install apps/arcakids/android/app/build/outputs/apk/debug/app-debug.apk
```

### Guarding native Android changes (Kotlin)

`npm run build:arcakids` / `npm run build:noe` **automatically run the npm
`prebuild:*` hook first** (`expo prebuild -p android`), which clears and regenerates
the `android/` folder. That **wipes any manual Kotlin edits** (e.g.
`DeviceOwnerModule.kt`, `ParentalUsageModule.kt`) unless git protects them:

- Expo only preserves the native folder when git can see it as committed.
- `apps/*/.gitignore` already re-includes `android/` (`!/ios` / `!/android`).

Required workflow once the directory tree is the repo root:

```bash
git init
git add .
git commit -m "chore: baseline - commit android/ so expo prebuild preserves it"
```

After committing, `expo prebuild` treats `android/` as user-owned and no longer
cleans it. If a Kotlin change is still in the working tree (edited-but-uncommitted)
`prebuild` can revert it, so follow this order for native changes:

1. Edit Kotlin.
2. Commit the Kotlin change **before** any `npm run build:*`.
3. Build.

Without git in the repo, run Gradle directly to avoid the wipe:
`cd apps/arcakids/android && gradlew.bat assembleDebug` (requires `local.properties`
with `sdk.dir=...`, which is gitignored on purpose).

## Database workflow

- Every schema change MUST be a new migration: `supabase migration new <name>`.
- Never edit the database manually without the corresponding migration.
- Full local stack: `supabase start` / `supabase stop` (Docker required).

## Change rules

Before touching important code: inspect the files, understand the architecture, identify
dependencies, make the minimal change, run validations, document the change.

## Commit conventions

Conventional Commits (feat:, fix:, refactor:, docs:, chore:). No AI attribution.

## Testing guide

Tests use **Jest with `jest-expo`**, not vitest.
Each app owns its tests inside `apps/<app>/src` (colocated with source). The shared
package (`packages/shared`) is type-checked but has **no test script** — its logic
is covered by tests living in an app (e.g. `apps/arcakids/src/features/verses/select-verse.test.ts`).

Run tests:

```bash
npx jest select-verse            # inside apps/arcakids -> 9 tests
npx jest --watch                 # inside apps/<app>, watch mode
```

- Preset: `apps/arcakids/jest.config.js` (preset: jest-expo).
- `@noe-arcakids/.*` is already in `transformIgnorePatterns`, so imports across workspaces
  compile inside the test environment.
- **AsyncStorage pitfall**: importing the shared barrel (`@noe-arcakids/shared`) transitively
  loads `theme-context` → `@noe-arcakids/storage`, which touches the native `AsyncStorage`
  module that jest-expo can't provide. Tests that touch shared code MUST mock it first:

```ts
jest.mock('@noe-arcakids/storage', () => ({
  storage: { get: jest.fn(), save: jest.fn(), remove: jest.fn(), clear: jest.fn() },
}));
```

  Same pattern is used in `location-service.test.ts`. Without the mock you get
  `AsyncStorage: null is not an object (evaluating 'RCTAsyncStorage...')`.

- Android native modules (Kotlin in `apps/*/android`) are validated by the Gradle build
  (`npm run build:arcakids`), not by Jest.