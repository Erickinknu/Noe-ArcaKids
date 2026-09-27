# builds/

Carpeta de APKs entregables. Por defecto los binarios están gitignored; aquí se versiona este README.

Excepción: los APKs de hito se versionan a pedido explícito, para que quede una copia
instalable junto al código que los produjo. hoy están versionados los de **1.4.1**; el resto
sigue ignorado.

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
