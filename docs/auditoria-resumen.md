# Resumen Ejecutivo de Auditoría NOE + ARCA KIDS

**Fecha:** 2026-08-31  
**Alcance:** Auditoría exhaustiva (seguridad, limpieza, congruencia, lógica, matemática, redes, referencias, UX/UI, textos, i18n, colores, estructuras, TS/JS, SQL) y aplicación de correcciones.

---

## 🔴 Seguridad (Crítico)

| Hallazgo | Acción aplicada |
|----------|-----------------|
| PIN almacenado en texto plano / hash sin sal / sin lockout | **Reescrito `pin-service.ts`**: SHA-256 + sal aleatoria 16 bytes, comparación en tiempo constante, lockout 5 intentos/30s. Añadida dep `expo-crypto`. |
| RPCs parentales ejecutables por `anon`/`public` | **Migración SQL `20260830000000_security_hardening.sql`**: `REVOKE EXECUTE` en `set_device_blocked`, `trigger_device_alert`, `get_children_locations`, `upsert_app_category`, `sync_child_apps`; `GRANT` solo a `authenticated` + política `is_family_parent`. |
| RPCs `SECURITY DEFINER` sin `search_path` | Migración: `SET search_path = public` en todas (14 funciones). |
| Falta validación lat/lon en `update_device_location` | Migración: `CHECK (lat BETWEEN -90 AND 90 AND lon BETWEEN -180 AND 180)`. |
| `enqueue_device_command` sin autorización padre | Migración: añade `is_family_parent` en rama `provisioning`. |
| Políticas RLS blandas en `geofences`/`web_filters`/`push_tokens`/`unlock_requests` | Migración: `WITH CHECK (is_family_parent())` + `REVOKE ALL ON ... FROM anon`. |
| Seed habilitado sin `seed.sql` + contraseñas débiles | `supabase/config.toml`: `enabled = false`, `minimum_password_length = 8`, `password_requirements = "lower_upper_letters_digits"`. |
| OSM Leaflet sin SRI (supply-chain risk) | `osm-map.tsx`: `integrity` + `crossorigin` en CSS/JS (hashes oficiales Leaflet 1.9.4). |
| Service Role Key en repositorio | Verificado: **no presente** en archivos versionados (`git grep` limpio). |

---

## 🟡 Limpieza / Código Muerto

| Módulo | Acción |
|--------|--------|
| `apps/noe/src/hooks/use-auth-guard.ts` | Eliminado (huérfano) |
| `apps/noe/src/hooks/use-session-timeout.ts` | Eliminado (huérfano) |
| `apps/noe/src/components/ui/{stat-card,blocked-apps-section,child-card,rules-form}.tsx` | Eliminados (huérfanos) |
| `apps/noe/src/features/notifications/services/notification-service.ts` | Eliminado (huérfano + vulnerabilidad push) |
| `packages/shared: useConnectionStore, ConnectionState` | Eliminados del barrel (sin consumidores) |
| `packages/shared: validateEmail/Name/Phone/ChildName/ChildAge` | Eliminados (no usados) |
| `packages/shared: createStyles` | Eliminado (no usado) |
| `packages/shared: resetRateLimit` | Eliminado (no usado) |
| `packages/config: FEATURE_FLAGS` | Eliminado completo (dead code, solo docs lo referenciaban) |

---

## 🟢 Lógica / Matemáticas / Redes

| Hallazgo | Corrección |
|----------|------------|
| Dashboard/Activity usaban `toISOString()` (UTC) → día erróneo en husos | `dashboard-repository.ts`: helper `localToday()`; `activity-service.ts`: `localDateKey(date)` — ambos usan fecha local. |
| Notificaciones ARCA KIDS: división por cero en `% uso` | `notification-service.ts`: `limitMinutes > 0 ? ... : 100`. |
| Referencias circulares / imports rotos | Consolidación Card/Input resuelve duplicación y unifica source of truth. |

---

## 🔵 UX/UI / i18n / Accesibilidad

| Área | Cambios (Agents A + B) |
|------|------------------------|
| Claves i18n rotas NOE | Añadidas: `dashboard.{connectedCount,noChildrenOnline,seeAll,recentActivity,overLimit,details,selectChild}`, `profile.{signOutConfirm,signOutCancel}`, `settings.title`, `notifications.{savedFlash,loadError}`; normalizadas `common.cancel`, `settings.title`. |
| Entidades HTML en textos | `pin.tsx` (`&rarr;`), `terminos.tsx`/`privacidad.tsx` (`&ldquo;`/`&rdquo;`) — corregidas. |
| Dark mode NOE | `useTheme()` en `_layout.tsx`, `notifications/index.tsx`, `linking/index.tsx`, `children/*`, `activity/*`, `profile/*`, `rules/index.tsx`, `index.tsx` (tiles→tokens). |
| ARCA KIDS theme-toggle | Claves `arcakids.theme.{light,dark}`, `useColorScheme()` sistema, a11y labels. |
| ARCA KIDS blocked screen | Dark mode tokens + claves `arcakids.blocked.{title,body}`. |
| Splash/loading contraste | `_layout.tsx` (style anulador quitado), `loading-screen.tsx` (spinner `#FFFFFF` sobre `#208AEF`). |
| Settings/launcher/button a11y | `colors.onPrimary`, back button a11y, `accessibilityRole/State` en Button. |
| Lint `react/no-unescaped-entities` | 4 errores corregidos (`pin.tsx`, `terminos.tsx`: comillas `"` → `“`/`”`). |

---

## 🟣 Estructuras / TypeScript / Consolidación

| Cambio | Detalle |
|--------|---------|
| **Card/Input consolidados** | Creados en `packages/shared/src/components/{card,input}.tsx`; exportados en barrel; **39 importadores** actualizados en ambas apps; 4 archivos locales borrados. |
| **Dependencias declaradas** | `apps/noe`: `@supabase/supabase-js`, `expo-crypto`; `apps/arcakids`: `@expo/vector-icons`; eliminado `zustand` de arcakids. |
| **Barrel cleanup** | `packages/shared/src/index.ts`: exportaciones limpias (sin dead exports). |
| **Typecheck** | ✅ 6 workspaces (shared, config, storage, supabase, types, noe, arcakids) — sin errores. |
| **Lint** | ✅ 0 errores en ambas apps (solo warnings preexistentes). |

---

## 📄 Documentación

| Archivo | Cambio |
|---------|--------|
| `docs/environment.md` | Sección "Feature flags" eliminada (FEATURE_FLAGS removido). |
| `docs/roadmap.md` | FASE 8 actualizada: esqueleto offline-sync-engine eliminado, flag removido; se implementará desde cero con migración real. |
| `docs/auditoria-resumen.md` | Este documento. |

---

## 📦 Commits Temáticos

1. `3560e98` — **security**: PIN hardening, SQL RLS/RPCs, OSM SRI, timezone, div/0.
2. `171ed8b` — **cleanup**: dead NOE hooks/components/notification-service; shared validators/createStyles/resetRateLimit; drop FEATURE_FLAGS.
3. `0d24bc8` — **refactor**: Card/Input → `@noe-arcakids/shared`; 39 importers; delete local duplicates.
4. `386e406` — **feat**: i18n keys + dark mode + a11y + deps (expo-crypto, supabase-js, vector-icons, drop zustand); docs.

---

## ⏭️ Pendiente / Próximos Pasos

| Ítem | Estado |
|------|--------|
| Aplicar migración SQL a Supabase (`arca-kids-noe`, ref `jvxeiexsmnoorhhphjld`) | **En curso (D)** |
| Builds Android de verificación (`build:android` en ambas apps) | Opcional — typecheck/lint OK |
| Push a remoto (cuando exista) | Pendiente |

---

## ✅ Verificación Final

- `npm install`: OK (911 packages, 11 moderate vulns no bloqueantes).
- `npx tsc --noEmit`: **OK** en los 7 paquetes/workspaces.
- `npx expo lint`: **OK** (0 errores, 32 warnings preexistentes) en NOE y ARCA KIDS.
- Git status: **working tree clean** (tras 4 commits).