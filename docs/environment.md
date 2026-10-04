# Environment

## Variables

Both apps read the same two variables. Values are inlined by Expo at build time (`EXPO_PUBLIC_*`).

| Variable | Where | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `apps/<app>/.env` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/<app>/.env` | Public anon/publishable key only |
| `EXPO_PUBLIC_APP_ENV` | `apps/<app>/.env` | `development` \| `staging` \| `production`. Off/release builds behave as `production`. Used by `packages/config` `appEnv`. |
| `EXPO_PUBLIC_SENTRY_DSN` | `apps/<app>/.env` | Optional. Enables runtime `sentryService` when set. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | EAS secrets | Only used to activate the Sentry Expo config plugin during EAS `prebuild`/build. |
| `SENTRY_AUTH_TOKEN` | EAS secrets | Sentry upload token (never in the repo). |

Templates: `apps/noe/.env.example`, `apps/arcakids/.env.example`, and `scripts/.env.e2e.example` for the server-side E2E harness (`E2E_EMAIL`, `E2E_PASSWORD`, optional `E2E_RUN_BURST=1`).

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

`packages/config/src/app-info.ts` owns `APP_VERSION` and `APP_NAMES` (single source of truth for the version shown in the UI).

La versiÃ³n de build por app vive en `apps/<app>/app.config.ts` (y su `android/app/build.gradle` sincronizado). Ambas deben coincidir con `APP_VERSION`; `npm run check:versions` lo verifica junto con la raÃ­z y los `package.json`, y corre en `npm run validate` y CI.


## Seguridad (acciones pendientes obligatorias)

### 1) Revocar PAT comprometido
- **Token afectado:** `SUPABASE_ACCESS_TOKEN` (ver `docs/auditoria-resumen.md`).
- **Estado:** **COMPROMETIDO** — pendiente de revocación.
- **Acción manual (no automatizable):**
  1. Ir a Supabase ? Project Settings > API (o gestión del PAT utilizado).
  2. Revocar/eliminar ese PAT inmediatamente.
  3. Generar uno nuevo solo si es necesario y rotarlo en CI/local donde corresponda.
  4. Nunca commitear tokens. Registrar evidencia en `docs/security-audit-log.md`.

### 2) `jwt-secret-probe` (HTTP 410)
- **Estado:** Detectado (HTTP 410). **Eliminación bloqueada por herramienta** en esta sesión.
- **Acción manual:**
  1. Localizar y eliminar/inhabilitar el recurso asociado vía Supabase Dashboard o CLI con permisos suficientes.
  2. Verificar que deja de responder.
  3. Registrar evidencia en `docs/security-audit-log.md`.