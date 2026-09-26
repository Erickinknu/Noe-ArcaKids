# MASTER — Estado y vector de arranque

Repo: `github.com/Erickinknu/Noe-ArcaKids` · Ramas: `main`. Monorepo npm workspaces: `apps/{noe,arcakids}`, `packages/shared`.

**Versión actual:** 1.4.0 (versionCode 12) en ambas apps, release firmado arm64-v8a.
**Estado:** piloto de 20 familias (MVP gratis, APK directo) — ver `docs/mvp.md`.

## Mapas de docs

| Documento | Para qué es |
|---|---|
| `docs/mvp.md` | Alcance del piloto, criterios de éxito medibles y métricas. |
| `docs/implementation-status.md` | Matriz por feature (arquitectura, native layer, backend, UI). Fuente de verdad de versión. |
| `docs/runbook.md` | Builds release firmados, Sentry, planes, hardening BD, enforcement por OEM, CI, Play Store. |
| `docs/roadmap.md` | Fases del plan. |
| `ARCHITECTURE.md` / `docs/architecture.md` | Arquitectura. |
| `docs/database.md` / `docs/environment.md` / `docs/development.md` | Schema y migraciones, env vars, workflow de desarrollo. |
| `CHANGELOG.md` | Historial. |
| `builds/README.md` | Entregables APKs (binarios gitignored). |

## Ciclo diario

```powershell
npm run validate        # typecheck + lint (todos los workspaces)
npm test                # jest NOE (43) + ARCA KIDS (17)
```

- Commits por tema (conventional: `feat/chore/fix/docs` + scope). Nunca `git add .` sin revisar.
- El CI (`.github/workflows/ci.yml`) corre typecheck + lint + test en cada push/PR a `main`.
- Release firmado: ver `docs/runbook.md` §1 (keystore local gitignored, `-PreactNativeArchitectures=arm64-v8a`). Builds tardan ~1h en Windows; no versionar binarios.

## Pendientes conocidos (manuales / requieren input)

1. **Leaked password protection ON** — dashboard Supabase → Auth → seguridad (no tiene API SQL). Adelantado al arranque del piloto (decisión 2026-09-25).
2. **`google-services.json` de Firebase** para push remoto real en NOE (cliente y canal ya implementados).
3. **Sentry** — decisión: fuera del piloto (telemetría de bloqueantes vía feedback en-app). Revisar post-piloto; el código y el plugin condicionante están listos y solo requieren `SENTRY_ORG`, `SENTRY_PROJECT`, `EXPO_PUBLIC_SENTRY_DSN` (y authToken para source maps).
4. **Separar proyecto prod de dev** (hoy comparten `jvxeiexsmnoorhhphjld`).
5. **Dominio propio / SMTP transaccional** para entregabilidad de emails.

## Decisiones abiertas

- Precio/suscripción post-piloto (hoy `claim_subscription` manual, gating free).
- Play Store / distribuir vía APK por ahora.
- Encuesta de disposición a pagar a los 30 días (ver `docs/mvp.md` §3).