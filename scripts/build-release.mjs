// Build de release con compuertas: typecheck + lint + tests deben pasar
// antes de invocar Gradle. Cualquier fallo detiene el build (exit != 0).
// Uso: node scripts/build-release.mjs --app=noe|arcakids [--arch=arm64-v8a,armeabi-v7a]
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);
const APP = args.app;
const DEFAULT_ARCH = { noe: 'arm64-v8a,armeabi-v7a', arcakids: 'arm64-v8a' };
if (!APP || !DEFAULT_ARCH[APP]) {
  console.error('Uso: node scripts/build-release.mjs --app=noe|arcakids [--arch=...]');
  process.exit(2);
}
const ARCH = args.arch || DEFAULT_ARCH[APP];
const WS = `@noe-arcakids/${APP === 'noe' ? 'noe' : 'arcakids'}`;

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(cmd, runArgs, opts = {}) {
  console.log(`\n### ${cmd} ${runArgs.join(' ')}`);
  const shell = opts.shell ?? (process.platform === 'win32' && cmd !== 'cmd.exe');
  const r = spawnSync(cmd, runArgs, { stdio: 'inherit', shell, ...opts });
  if (r.status !== 0) {
    console.error(`FALLO (${r.status}): ${cmd} ${runArgs.join(' ')} — build detenido.`);
    process.exit(r.status ?? 1);
  }
}

run(NPM, ['run', 'typecheck', '--workspace', WS]);
run(NPM, ['run', 'lint', '--workspace', WS]);
run(NPM, ['run', 'test', '--workspace', WS]);

const env = {
  ...process.env,
  JAVA_HOME: 'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot',
  ANDROID_HOME: 'C:\\Users\\Usuario\\Android\\Sdk',
  ANDROID_SDK_ROOT: 'C:\\Users\\Usuario\\Android\\Sdk',
  PATH: `C:\\Users\\Usuario\\.local\\nodejs\\node-v24.20.0-win-x64;${process.env.PATH}`,
};
run(
  'cmd.exe',
  ['/d', '/s', '/c', `gradlew.bat assembleRelease -PreactNativeArchitectures=${ARCH} --console=plain`],
  { cwd: `apps/${APP}/android`, env, shell: false },
);
// Post-chequeo anti trampa up-to-date de Gradle: el bundle debe ser fresco y con la version.
run(NPM, ['run', 'check:bundle', '--', `--app=${APP}`], { shell: process.platform !== 'win32' ? false : true });
// Post-chequeo de firma: la huella del certificado debe coincidir con la
// esperada POR APP (scripts/release-certs.json). Detecta keystore cruzado.
{
  const { readFileSync } = await import('node:fs');
  const { execFileSync } = await import('node:child_process');
  const expected = JSON.parse(readFileSync('scripts/release-certs.json', 'utf8'))[APP];
  if (!expected) {
    console.error(`Sin huella esperada para app=${APP} en scripts/release-certs.json — build detenido.`);
    process.exit(1);
  }
  const signer =
    'C:\\Users\\Usuario\\Android\\Sdk\\build-tools\\35.0.0\\apksigner.bat';
  let out;
  try {
    out = execFileSync(signer, ['verify', '--print-certs', `apps/${APP}/android/app/build/outputs/apk/release/app-release.apk`], { encoding: 'utf8' });
  } catch (e) {
    console.error(`apksigner verify fallo para ${APP} — build detenido.`);
    process.exit(1);
  }
  const m = out.match(/SHA-256 digest:\s*([0-9A-Fa-f:]+)/);
  const got = m ? m[1].replace(/:/g, '').toLowerCase() : '';
  console.log(`Huella cert ${APP}: ${got}`);
  if (got !== expected.toLowerCase()) {
    console.error(`HUELLA INCORRECTA en ${APP}: esperada ${expected}, obtenida ${got} — build detenido. Revisa keystore.properties.`);
    process.exit(1);
  }
}
console.log(`\nOK release ${APP} (${ARCH}). Verifica con apksigner antes de distribuir.`);
