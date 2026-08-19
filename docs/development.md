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

## Database workflow

- Every schema change MUST be a new migration: `supabase migration new <name>`.
- Never edit the database manually without the corresponding migration.
- Full local stack: `supabase start` / `supabase stop` (Docker required).

## Change rules

Before touching important code: inspect the files, understand the architecture, identify
dependencies, make the minimal change, run validations, document the change.

## Commit conventions

Conventional Commits (feat:, fix:, refactor:, docs:, chore:). No AI attribution.