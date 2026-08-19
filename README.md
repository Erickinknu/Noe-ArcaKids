# NOE + ARCA KIDS

Parental control system. Two independent Android apps sharing one Supabase backend:

| App | Role | Android ID | Folder |
|---|---|---|---|
| NOE | Parent / responsible adult | `com.noe.parent` | `apps/noe` |
| ARCA KIDS | Child | `com.arcakids.child` | `apps/arcakids` |

React Native (Expo) + TypeScript, Expo Router, Supabase, npm workspaces monorepo.

> Status: **Phase 0 - base architecture**. No parental control features are implemented yet (by design). See `docs/roadmap.md`.

## Quick start

```bash
npm install
npm run typecheck
npm run lint
```

## Run in development

```bash
# NOE
cd apps/noe && npm start

# ARCA KIDS
cd apps/arcakids && npm start
```

## Build APKs

```bash
# generate the android/ folders once (already committed in this repo)
npm run prebuild:noe
npm run prebuild:arcakids

# compile debug APKs (independent builds)
npm run build:noe        # apps/noe/android/app/build/outputs/apk/debug/app-debug.apk
npm run build:arcakids   # apps/arcakids/android/app/build/outputs/apk/debug/app-debug.apk
```

## Documentation

- `ARCHITECTURE.md` - architecture summary
- `docs/architecture.md` - detailed architecture
- `docs/development.md` - development workflow
- `docs/environment.md` - environment variables and Supabase setup
- `docs/database.md` - database schema and migrations
- `docs/roadmap.md` - phases