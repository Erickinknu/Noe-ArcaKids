# builds/

Carpeta de APKs entregables. Los binarios están gitignored; aquí solo se versiona este README.

Estructura:

- `noe/` — app del padre (`com.noe.parent`)
- `arcakids/` — app del hijo (`com.arcakids.child`)

Convención de nombres:

- `noe/NOE-<version>-<buildType>.apk`
- `arcakids/ARCA-KIDS-<version>-<buildType>.apk`

Cada APK se honra en el README correspondiente de su carpeta al momento de generar (versión, hash de commit y fecha), tal como pide el proceso de liberación.