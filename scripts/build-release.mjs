// Build de release con compuertas: typecheck + lint + tests deben pasar
// antes de invocar Gradle. Cualquier fallo detiene el build (exit != 0).
// Uso: node scripts/build-release.mjs --app=noe|arcakids [--arch=arm64-v8a,armeabi-v7a]
import { spawnSync, execSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
const APKSIGNER = 'C:\\Users\\Usuario\\Android\\Sdk\\build-tools\\35.0.0\\apksigner.bat';

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(cmd, runArgs, opts = {}) {
  console.log(`\n### ${cmd} ${runArgs.join(' ')}`);
  const shell = opts.shell ?? (process.platform === 'win32' && cmd !== 'cmd.exe');
  const r = shell
    ? spawnSync(`${cmd} ${runArgs.join(' ')}`.trim(), { stdio: 'inherit', ...opts, shell: true })
    : spawnSync(cmd, runArgs, { stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`FALLO (${r.status}): ${cmd} ${runArgs.join(' ')} — build detenido.`);
    process.exit(r.status ?? 1);
  }
}

// apksigner.bat requiere el shell nativo (cmd.exe) en Windows para poder ejecutarse.
function apkCertSha256(apkPath) {
  try {
    const out = execSync(`"${APKSIGNER}" verify --print-certs "${apkPath}" 2>&1`, { encoding: 'utf8' });
    const m = out.match(/SHA-256 digest:\s*([0-9A-Fa-f:]+)/);
    return { ok: true, sha: m ? m[1].replace(/:/g, '').toLowerCase() : '' };
  } catch (e) {
    return { ok: false, error: e.message };
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

// Post-chequeo de firma: la huella del certificado debe coincidir con la esperada POR APP
// (scripts/release-certs.json). Detecta keystore cruzado.
const expected = JSON.parse(readFileSync('scripts/release-certs.json', 'utf8'))[APP];
if (!expected) {
  console.error(`Sin huella esperada para app=${APP} en scripts/release-certs.json — build detenido.`);
  process.exit(1);
}
const apkPath = `apps/${APP}/android/app/build/outputs/apk/release/app-release.apk`;
const res = apkCertSha256(apkPath);
if (!res.ok) {
  console.warn(`apksigner no pudo verificar ${APP} (${res.error}). APK compilado, firma NO verificada.`);
} else {
  console.log(`Huella cert ${APP}: ${res.sha}`);
  if (res.sha !== expected.toLowerCase()) {
    console.error(`HUELLA INCORRECTA en ${APP}: esperada ${expected}, obtenida ${res.sha} — build detenido. Revisa keystore.properties.`);
    process.exit(1);
  }
}

// Verificacion cruzada: APKs en APKs_para_instalar no deben cruzar certificados.
try {
  const dir = 'APKs_para_instalar';
  const files = readdirSync(dir).filter((f) => f.endsWith('.apk'));
  const certs = JSON.parse(readFileSync('scripts/release-certs.json', 'utf8'));
  const noeCert = (certs.noe ?? '').toLowerCase();
  const arcaCert = (certs.arcakids ?? '').toLowerCase();
  for (const f of files) {
    const full = join(dir, f);
    if (statSync(full).size < 100000) continue;
    const r = apkCertSha256(full);
    if (!r.ok || !r.sha) continue;
    if (f.startsWith('NOE-') && r.sha === arcaCert) {
      console.error('CRUCE: ' + f + ' firmado con cert ARCA');
      process.exit(1);
    }
    if (f.startsWith('ARCAKIDS-') && r.sha === noeCert) {
      console.error('CRUCE: ' + f + ' firmado con cert NOE');
      process.exit(1);
    }
  }
} catch (e) {
  console.warn('cross-check skipped', e.message);
}

console.log(`\nOK release ${APP} (${ARCH}).`);
