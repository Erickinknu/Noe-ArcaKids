# Database

Managed with the Supabase CLI. All changes go through migrations in `supabase/migrations/` -
never edit the schema manually without a migration.

## Domain model

```
Family
  ├── Profiles (adults, role = parent; linked to auth.users)
  └── Children
        └── Devices
              └── Sessions (usage sessions)
```

## Tables (initial migration)

| Table | Purpose | Key columns |
|---|---|---|
| `families` | Household unit | `id`, `name` |
| `profiles` | Adult (parent) profile per auth user | `family_id`, `user_id` (-> auth.users, unique), `email`, `display_name` |
| `children` | Child profile | `family_id`, `display_name`, `avatar_url` |
| `devices` | A device belonging to a child | `child_id`, `name`, `platform` (android/ios), `app_version`, `last_seen_at` |
| `sessions` | Usage/time session of a child on a device | `child_id`, `device_id`, `started_at`, `ended_at` |

All id columns are UUIDs (`gen_random_uuid()`), timestamps are `timestamptz`.
`devices.child_id` is nullable on purpose: a device may exist before linking (Phase 3).

## Row Level Security

RLS is enabled on every table. Policies grant SELECT only to `authenticated` users who are
members of the row's family, via the helper:

- `public.is_family_member(family_id uuid) -> boolean`
  - `SECURITY DEFINER` (bypasses RLS to avoid policy recursion), `search_path` pinned to `public`
  - body checks `profiles.user_id = auth.uid()`, so it can only answer about the caller
  - EXECUTE revoked from `public`/`anon`, granted to `authenticated` only

Insert/update/delete policies intentionally do NOT exist yet: linking and data creation are
designed in Phase 3. Until then the Data API exposes read-only access for family members.

## Grants

`SELECT` is granted to `authenticated` on all five tables (the `anon` role has no access).
If tables ever become invisible via the Data API, verify the Data API settings and explicit
grants before anything else.

## Local database commands

```bash
supabase start          # full local stack (Docker)
supabase db reset       # re-apply migrations + seed
supabase migration list # migration status
```

## Seeding

`supabase/seed/` is reserved for demo/dev seed data (currently empty by design).