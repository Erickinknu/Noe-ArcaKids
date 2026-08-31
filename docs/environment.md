# Environment

## Variables

Both apps read the same two variables. Values are inlined by Expo at build time (`EXPO_PUBLIC_*`).

| Variable | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `apps/<app>/.env` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/<app>/.env` | Public anon/publishable key only |

Templates: `.env.example` (root), `apps/noe/.env.example`, `apps/arcakids/.env.example`.

Real `.env` files are gitignored and never committed. A missing `.env` is safe: apps start
unconfigured and log a warning instead of crashing.

> The `service_role` key must NEVER appear in the apps, env files, docs, or commits.

## Supabase setup

### Option A - hosted project (apps need this to actually authenticate)

1. Create a project at https://supabase.com/dashboard.
2. Apply the migrations from `supabase/migrations/` (SQL editor or `supabase db push`).
3. Copy the project URL and anon key into each app's `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOURREF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart the Expo dev server or rebuild the APK (the values are inlined at build time).

### Option B - local CLI stack (database work / testing)

Requires Docker.

```bash
supabase start       # boots Postgres, API, Studio, Inbucket, etc.
supabase db reset    # applies migrations + seed from scratch
supabase stop
```

With the local stack, the API URL is `http://127.0.0.1:54321` and the anon key is the one
printed by `supabase start` (or the `demo` key in `config.toml`).

## App metadata

`packages/config/src/app-info.ts` owns `APP_VERSION` and `APP_NAMES` (single source of truth).