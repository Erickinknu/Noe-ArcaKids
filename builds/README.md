# builds/

Carpeta de APKs entregables. **Los binarios están gitignored**; aquí solo se versiona este README.

> **Los releases van a GitHub Releases, no al repo.** El APK de cada hito se publica como
> *asset* del release de la versión correspondiente en
> `github.com/Erickinknu/Noe-ArcaKids/releases`, y el repo guarda únicamente el código, los
> hashes y esta documentación. Esta carpeta es el área de trabajo local: se copia el APK
> generado, se sube como asset y se puede borrar. La regla `builds/*` de `.gitignore`
> (línea 55) lo bloquea, y así se mantiene.

## Flujo de publicación

```powershell
# 1. Generar el release firmado (ver docs/runbook.md §1)
cd apps/noe/android;       .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
cd apps/arcakids/android;  .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a

# 2. Copiar a builds/ con el nombre de la convención
Copy-Item apps/noe/android/app/build/outputs/apk/release/app-release.apk       builds\noe\NOE-<version>-release.apk
Copy-Item apps/arcakids/android/app/build/outputs/apk/release/app-release.apk builds\arcakids\ARCA-KIDS-<version>-release.apk

# 3. Verificar antes de publicar
aapt2 dump badging builds\noe\NOE-<version>-release.apk          # package, versionCode, native-code
apksigner verify --print-certs builds\noe\NOE-<version>-release.apk
Get-FileHash builds\noe\NOE-<version>-release.apk -Algorithm SHA256

# 4. Publicar como assets del release (gh autenticado)
gh release create v<version> --repo Erickinknu/Noe-ArcaKids --title "<version> - <resumen>" --notes-file <notas>
gh release upload v<version> builds\noe\NOE-<version>-release.apk builds\arcakids\ARCA-KIDS-<version>-release.apk --repo Erickinknu/Noe-ArcaKids
```

Estructura:

- `noe/` — app del padre (`com.noe.parent`)
- `arcakids/` — app del hijo (`com.arcakids.child`)

Convención de nombres:

- `noe/NOE-<version>-<buildType>.apk`
- `arcakids/ARCA-KIDS-<version>-<buildType>.apk`

Cada APK se honra en el README correspondiente de su carpeta al momento de generar (versión, hash de commit y fecha), tal como pide el proceso de liberación.

## Hito 1.4.1 (2026-09-27)

| App | APK | versionCode | package | Tamaño | SHA-256 del archivo |
|---|---|---|---|---|---|
| NOE | `noe/NOE-1.4.1-release.apk` | 13 | `com.noe.parent` | 51,1 MB | `4954f083a8670aa5c4c5827572b38cdb671593f603dea647881f3b42f2924530` |
| ARCA KIDS | `arcakids/ARCA-KIDS-1.4.1-release.apk` | 13 | `com.arcakids.child` | 57,7 MB | `39841721cb60745e1f438634d14c12a22ddab4d05409e27b90450198bd4a3ab0` |

- Commit: `22a8e9e` — `feat(noe): Fase 3 de motion en Hijos (skeleton, press y entrada de lista)`
- Build: `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a` (solo `arm64-v8a`, como los hitos anteriores).
- Firmados con el `release.keystore` local de cada app (gitignored). Los SHA-256 de **certificado**
  no cambian respecto de 1.4.0 (`421ef025…` NOE / `1a7c8b64…` ARCA KIDS): `adb install -r`
  actualiza en sitio sin desinstalar.
- Verificados con `aapt2 dump badging` y `apksigner verify`; bundle Hermes embebido
  (`assets/index.android.bundle`).

### Dónde están estos APK

Estos dos APK se publicaron como assets del release
[`v1.4.1`](https://github.com/Erickinknu/Noe-ArcaKids/releases/tag/v1.4.1). **No están en el
historial de git**: llegaron a commitearse por error en `25fccbb` y se eliminaron del
historial con `git filter-repo` (no con `git rm`, que deja los blobs) tras publicarse el
release, con force-push de `main`, del tag `v1.4.1` y de las tres ramas `dependabot/*` que
habían heredado ese commit.

Consecuencias prácticas:

- `main` y `v1.4.1` apuntan a `205be58`; el historial conserva los 143 commits con sus
  mensajes, autores y fechas intactos, y 0 ficheros con contenido modificado.
- Un clon del repo pesa 10,3 MB, no 68,3 MB.
- La única copia local de cada APK es la salida de Gradle
  (`apps/<app>/android/app/build/outputs/apk/release/app-release.apk`), que además está
  gitignored.
- Cualquier APK nuevo que se deje en `builds/` sigue bloqueado por `.gitignore` (línea 55).
