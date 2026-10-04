import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const errors = [];
const expected = json('package.json').version;

const appInfo = read('packages/config/src/app-info.ts').match(/APP_VERSION\s*=\s*'([^']+)'/);
if (!appInfo) {
  errors.push('packages/config/src/app-info.ts: no se encontro APP_VERSION');
} else if (appInfo[1] !== expected) {
  errors.push(`packages/config/src/app-info.ts APP_VERSION=${appInfo[1]} != ${expected}`);
}

let expectedCode = null;
for (const app of ['noe', 'arcakids']) {
  const pkgVersion = json(`apps/${app}/package.json`).version;
  const config = read(`apps/${app}/app.config.ts`);
  const configVersion = config.match(/version:\s*'([^']+)'/)?.[1];
  const configCode = config.match(/versionCode:\s*(\d+)/)?.[1];
  const gradle = read(`apps/${app}/android/app/build.gradle`);
  const gradleVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  const gradleCode = gradle.match(/versionCode\s+(\d+)/)?.[1];

  const values = {
    'package.json': pkgVersion,
    'app.config.ts (version)': configVersion,
    'build.gradle (versionName)': gradleVersion,
  };
  for (const [label, value] of Object.entries(values)) {
    if (!value) errors.push(`apps/${app}: falta la version en ${label}`);
    else if (value !== expected) errors.push(`apps/${app}: ${label}=${value} != ${expected}`);
  }

  if (!configCode) errors.push(`apps/${app}: falta versionCode en app.config.ts`);
  else if (!gradleCode) errors.push(`apps/${app}: falta versionCode en build.gradle`);
  else if (configCode !== gradleCode) {
    errors.push(`apps/${app}: versionCode app.config.ts=${configCode} != build.gradle=${gradleCode}`);
  }

  if (configCode !== null && expectedCode !== null && configCode !== expectedCode) {
    errors.push(`apps/${app}: versionCode=${configCode} != ${expectedCode} (las apps deben ir en versionCode lockstep)`);
  }
  if (expectedCode === null) expectedCode = configCode;
}

if (errors.length > 0) {
  console.error(`Version drift detectado (esperado ${expected} / versionCode ${expectedCode ?? '?'}):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`Versiones OK: ${expected} (versionCode ${expectedCode}) en raiz, app-info, ambas apps y build.gradle.`);
