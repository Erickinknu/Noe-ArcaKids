# Runbook de operaciones — NOE + ARCA KIDS

Última actualización: 2026-09-17.

## 1. Builds de release (firmados)

Los APKs de producción se firman con un keystore release local. **No está publicado en el repo.**

- Keystore: `apps/<app>/android/app/release.keystore` (gitignored).
- Credenciales: `apps/<app>/android/app/keystore.properties` (gitignored).
- Backup con instrucciones y contraseñas: `C:\Users\Usuario\Documents\APKs_para_instalar\keystores-release\`.
- Cualquier `gradlew assembleRelease` re-firma con el mismo keystore → misma firma en updates.
- Cambiar de keystore rompe las instalaciones previas (habría que desinstalar e instalar de nuevo).

Build del release ARCA KIDS (solo `arm64-v8a` por longitud de rutas):

```powershell
cd apps/arcakids/android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
# APK en apps/arcakids/android/app/build/outputs/apk/release/
# gradle.properties ya excluye armeabi-v7a y x86 (CMAKE_OBJECT_PATH_MAX se excede
# con la longitud de ruta del workspace); por defecto quedan arm64-v8a + x86_64.
```

> Nunca usar `npm run build:*`. Git fuera de PATH en PowerShell: `& "C:\Program Files\Git\bin\git.exe"`.

**Workspace de Android Studio:** la carpeta `android/` en la raíz es un **composite build** que agrupa los proyectos nativos de ambas apps (que siguen en `apps/<app>/android`, requeridos por el autolinking de Expo/RN). Abrir `android/` en Android Studio para tener los dos proyectos en una sola ventana:

```powershell
cd android
.\gradlew.bat :noe:app:assembleDebug
.\gradlew.bat :arcakids:app:assembleRelease
```

**Depurar cada app desde Studio (abrir `android/`):**
- **NOE (`:noe`)**: correr `:noe` (config `noe.app`). Logcat tag por defecto + Sentry. El código TS vive en `apps/noe`; para cambios de JS se usa `npx expo start` con el metro de ese workspace (la app abre watching `noe`).
- **ARCA KIDS (`:arcakids`)**: correr `:arcakids`. Permisos a verificar en run: Device Owner (si aplica), `PACKAGE_USAGE_STATS`, `SYSTEM_ALERT_WINDOW`, **Accesibilidad** (`Settings > Accessibility > ARCA KIDS`). Logcat tags: `EnforcementService`, `AccessibilityEnforcementService`, `ProvisioningHandler`, `BlockingOverlayManager`. El FGS se ve en "Active services" y con `adb shell dumpsys activity services com.arcakids.child`.
- Los cambios de la capa Kotlin van en `apps/arcakids/android/...` y **deben reflejarse en `plugins/with-device-owner.js`** (fuente para `expo prebuild`). El plugin copia el `.kt` versionado si existe; editar el template solo si hay que regenerar desde cero (p.ej. `--clean`).

No borrar `apps/<app>/android`: sin esa carpeta se rompen `expo prebuild`, `expo run:android` y EAS.

### Toolchain Android (JDK 17) y limpieza

- **Gradle debe correr sobre JDK 17.** El JBR/launcher que trae Android Studio es JDK 25 y AGP 8.12 no lo soporta: emite `WARNING: A restricted method in java.lang.System has been called` y rompe la generación de prefab (`GeneratePrefabPackages` → `react-native-reanimated debug:x86 failed to configure C/C++`). Por eso `android/gradle/gradle-daemon-jvm.properties` (y el de cada app) fija `toolchainVersion=17`. Si Studio usara otro JDK: `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JDK = 17`.
- **`clean`:** las tareas `externalNativeBuildClean*` de AGP reconfiguran CMake y fallan cuando no existen los codegen de las librerías (p.ej. tras un `clean` global del composite, que borra `node_modules/<lib>/android/build`). En `apps/<app>/android/app/build.gradle` están desactivadas y reemplazadas por `cleanNativeCxx`, que borra `app/.cxx`; el siguiente build reconfigura CMake desde cero.
- Los codegen (`node_modules/<lib>/android/build/generated/source/codegen/jni`) los regenera cada `generateCodegenArtifactsFromSchema` durante el build. Si CMake falla con `add_subdirectory ... which is not an existing directory`, correr un build (p.ej. `:app:configureCMakeDebug[x86_64]`) para regenerarlos.

## 2. Sentry

Habilitar en producción:

1. Crear proyecto Sentry y un DSN.
2. `apps/<app>/.env`: `EXPO_PUBLIC_SENTRY_DSN=<dsn>`.
3. EAS secrets `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (activan el plugin `sentry-expo` y el upload de sourcemaps en el build).
4. El init es defensivo: sin DSN no hace nada y no rompe el runtime. Los errores capturados en runtime pasan por `sentryService` (`packages/shared/src/services/sentry-service.ts`), incluyendo `ErrorBoundary.componentDidCatch`.

## 3. Rate limiting del lado servidor

Migración `20260912000000_security_rate_limits.sql` (`api_throttle` + RPC `throttle`).

| Ruta | Regla |
|---|---|
| `redeem_pairing_code` (vía Edge Function `redeem-pair`) | throttle durable por IP (`ip:<IP>` 30/60 s) + por dispositivo (`pairing:<uuid>` 30/60 s) + lock por código: 10 fallos → 10 min. |
| `increment_achievement_for_device` | throttle `achievement:<device>:<key>` 60/60 s. |

TS refresca client-side `checkRateLimit` (defensa en capas): `packages/shared/src/rate-limiter.ts`.

**Por qué existe `redeem-pair` (Edge Function)**: un RPC de PostgREST que lanza excepción aborta **toda su transacción**, revirtiendo el ledger `api_throttle` que acabase de escribir (los fallos no se acumulan). La función de borde hace cada llamada a `throttle()` en su propia transacción DB que sí commitea (aunque luego respondamos 429/400 como JSON plano), por lo que el contador por IP/dispositivo es persistente. La app llama a la función vía `supabase.functions.invoke('redeem-pair', …)` (`linkingRepository.redeem`); la función valida entrada, aplica throttles y delega en el RPC `redeem_pairing_code` (mismas ACL/políticas).

Detalles de operación:

- Desplegar/actualizar la función: `supabase functions deploy redeem-pair` (con `verify_jwt=false`; es endpoint anónimo con validación propia). Código en `supabase/functions/redeem-pair/`.
- El RPC `redeem_pairing_code` desnudo **no** acumula intentos fallidos (rollback) — es intencionado; la limitación durable de redemptions vive en la función.
- `failed_attempts`/`locked_until` en `pairing_codes` son defense-in-depth y solo persisten si el redeem **commitea**; no bloquear al atacante tras 35 ráfagas por IP rotando UUIDs (el bloqueo real es el throttle por IP de la función).

## 4. Planes y suscripciones (estado actual)

- Tabla `subscriptions` + RPCs `get_my_subscription()` y `claim_subscription(p_plan)`.
- `claim_subscription` es un camino **manual** temporal: cualquier usuario autenticado puede activar un plan. Cuando se conecte cobro real (Play Billing o RevenueCat) los pagos insertarán filas con `provider='play'|'revenuecat'` (webhook/`service_role`), y `claim_subscription` debe restringirse o eliminarse.
- Gating en app NOE (`billingService`): plan free → 1 hijo (`FREE_MAX_CHILDREN`) y 5 apps bloqueadas (`FREE_MAX_BLOCKED_APPS`). El servicio cachea el plan 30 s.
- La pantalla `suscripcion.tsx` ya no dice "Próximamente": activa el plan al instante (modo manual).

### RLS en `api_throttle` (2026-09-17)

Migración `20260917000000_enable_rls_api_throttle.sql` aplicada vía herramienta de migraciones (MCP): `ALTER TABLE public.api_throttle ENABLE ROW LEVEL SECURITY;`.

- **No es `FORCE`**: el owner de la tabla (y por tanto `throttle()` que es `SECURITY DEFINER`) sigue leyendo el ledger; `service_role` tiene BYPASSRLS.
- Efecto: `anon`/`authenticated` ya no pueden leer/escribir el ledger por PostgREST. Solo las funciones SECURITY DEFINER (Edge Function `redeem-pair` incluida) y `service_role` acceden.
- El lint `rls_enabled_no_policy` sobre `api_throttle` es esperado (sin políticas a propósito): documentado en `implementation-status.md`.

## 4bis. APKs entregables (`builds/`)

- Carpeta `builds/{noe,arcakids}/` (binarios gitignored, se versiona el `README.md`).
- Convención: `builds/noe/NOE-<version>-debug.apk`, `builds/arcakids/ARCA-KIDS-<version>-debug.apk`.
- Generar debug:
  ```powershell
  cd apps/noe/android; .\gradlew.bat assembleDebug
  Copy-Item apps/noe/android/app/build/outputs/apk/debug/app-debug.apk builds/noe/NOE-1.3.6-debug.apk
  cd apps/arcakids/android; .\gradlew.bat assembleDebug
  Copy-Item apps/arcakids/android/app/build/outputs/apk/debug/app-debug.apk builds/arcakids/ARCA-KIDS-1.3.6-debug.apk
  ```
- Release firmado (solo producción): ver §1. Reportar siempre versión, hash de commit y ruta del APK al cerrar una fase.

## 4ter. Limitaciones de enforcement por fabricante

| Trituración | Efecto | Mitigación |
|---|---|---|
| Xiaomi (MIUI/HyperOS) | El usuario puede revocar el Device Owner/administrador y el Accessibility desde la IU de MIUI; el ahorro de batería mata el FGS. | `onDisableRequested` devuelve vacío (bloquea el diálogo), pero MIUI fuerza la desactivación del *administrador*; promoción del FGS en Ajustes > Batería; volver a activar tras `MY_PACKAGE_REPLACED`. |
| Huawei (EMUI) | Igual que MIUI + `WakeLock` restringido. | Documentar paso manual de re-activación. |
| Samsung (One UI) | `setPackagesSuspended` respeta al usuario en apps del sistema. | El bloqueo duro usa AppControl; el soft usa Accessibility (fallback universal). |
| Motorola/Xiaomi low-end | `runningAppProcesses` poco fiable (API 28+). | El overlay usa UsageEvents para detectar foreground; con Accessibility activo el fallback real es el servicio de accesibilidad. |

**Prominent disclosure / consentimiento:** el onboarding de ARCA KIDS explica y pide explícitamente: uso de accesibilidad (motivo parental), permiso de uso de datos de uso, overlay, y (si aplica) Device Owner. En Play Console adjuntar esta sección como justificación de `BIND_ACCESSIBILITY_SERVICE`.

## 5. Configuración de Supabase

- Proyecto único dev/prod: `jvxeiexsmnoorhhphjld`. **Pendiente separar un proyecto de producción** antes de lanzar.
- Aplicar migraciones con la herramienta de migraciones de Supabase (SQL editor / `supabase db push`).
- Seguridad: nunca usar `service_role` en las apps. Solo anon/publishable keys.

## 6. CI/CD

- `.github/workflows/ci.yml`: typecheck + lint + test en cada push/PR (ubuntu, Node 24, `npm ci`).
- Release builds firmados se hacen localmente (keystore no está en CI).

## 7. E2E simulado del lado servidor

```powershell
node scripts/e2e-server-simulation.mjs            # fase anónima
$env:E2E_EMAIL="parent-e2e@example.com"; $env:E2E_PASSWORD="..."; node scripts/e2e-server-simulation.mjs
$env:E2E_RUN_BURST="1"; node ...                   # ráfaga 40× contra el edge function → 429 durable
```

Crea el usuario de prueba una vez (registro normal en la app, confirmar email). Reporte JSON en `%TEMP%\e2e-server-simulation-report.json`.

Fases: A) anónima (ACL y guards), B) autenticada (claim plan + bursts de RPC), C) `redeem-pair` Edge Function (validación + throttle durable por IP).

## 8. Load smoke test (P4.9)

La auditoría **no** ejecutó load test contra el cluster. Estados actuales:

- `dashboard`/`activity` acotadas con `.limit(500)` (PAQUETE de uso) y `.limit(50)` (unlock requests); consultas 7 días → ~7 filas/hijo/día.
- Heartbeat: poller ARCA KIDS 15 s (`use-device-poller`); cada tick escribe `updateEnforcementState` y `device.last_seen_at` — con N hijos conectados = N×4 updates/min; revisar antes de escala.
- El throttle `api_throttle` evita abuso de redeems/logros anónimos.

## 9. Play Store / publicación

- Play Console requiere upload de clave nueva o reutilizar firma de app signing por app. Los keystores `arcakids-release` y `noe-release` respaldan la firma actual.
- E2E en dispositivo físico: instalar APK release (firma nueva) y seguir `docs/implementation-status.md` para flujo kitten.

## 10. Emulador Android (smoke test local)

**Entorno disponible:**
- SDK: `C:\Users\Usuario\Android\Sdk` (platform-tools, build-tools 36, emulator, system-images).
- AVD: `arca_test` (device: pixel_7, image: `system-images;android-35;google_apis;x86_64`).
- Android Studio GUI: `C:\Program Files\Android\Android Studio\bin\studio64.exe`.
- Aceleración: AEHD activo (reinstalar con `Sdk\extras\google\Android_Emulator_Hypervisor_Driver\silent_install.bat` si falta).

Arrancar emulador **headless** (pruebas automatizadas):
```powershell
Start-Process "$env:USERPROFILE\Android\Sdk\emulator\emulator.exe" -ArgumentList @('-avd','arca_test','-no-window','-no-audio','-no-boot-anim','-gpu','swiftshader_indirect')
$adb = "$env:USERPROFILE\Android\Sdk\platform-tools\adb.exe"
& $adb wait-for-device
do { Start-Sleep 5 } until ((& $adb shell getprop sys.boot_completed) -eq '1')
```

Arrancar emulador **con ventana** (interacción manual desde Android Studio):
```powershell
Start-Process "$env:USERPROFILE\Android\Sdk\emulator\emulator.exe" -ArgumentList @('-avd','arca_test')
```

Instalar APKs de release:
```powershell
$adb = "$env:USERPROFILE\Android\Sdk\platform-tools\adb.exe"
& $adb install -r 'C:\Users\Usuario\Documents\APKs_para_instalar\NOE-1.3.5-hardening.apk'
# ARCA KIDS release es arm64-v8a solo — NO carga en emulador x86_64. Buildar variante x86_64 primero:
cd apps/arcakids/android; .\gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64
& $adb install -r apps/arcakids/android/app/build/outputs/apk/release/app-release.apk
```

Lanzar apps y verificar UI:
```powershell
& $adb shell am start -n com.noe.parent/.MainActivity
Start-Sleep 20
& $adb shell uiautomator dump /sdcard/ui.xml; & $adb shell cat /sdcard/ui.xml
& $adb exec-out screencap -p > noe-login.png
```

Verificar ausencia de crashes:
```powershell
& $adb logcat -d | Select-String 'FATAL EXCEPTION'          # no debe haber entries de com.noe.parent / com.arcakids.child
& $adb shell ls /data/tombstones 2>$null | Measure-Object -Line
```

> La APK de ARCA KIDS con `x86_64` solo sirve para emular — **no instalar en dispositivo real** (lose arm64 native libs).