// Rota PUSH_ADMIN_SECRET sin exponerlo:
//  1. Genera un secreto nuevo (32 bytes hex).
//  2. Lo guarda en Vault (vault.update_secret sobre 'push_admin_secret').
//  3. Lo configura como secreto de la Edge Function (secrets set --env-file).
// Nunca imprime el valor. Los temporales se borran siempre.
// Uso: node scripts/rotate-push-secret.mjs
// Verificacion: con pruebas (401 sin secreto / secreto incorrecto), no mostrando el valor.
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const VAULT_NAME = 'push_admin_secret';
const FN_SECRET = 'PUSH_ADMIN_SECRET';

function run(args) {
  // PowerShell resuelve el shim supabase.ps1; los secretos viajan solo en archivos.
  const cmd = `supabase ${args.map((a) => `"${a.replace(/"/g, '""')}"`).join(' ')}`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function parseRows(out) {
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Respuesta CLI sin JSON');
  const j = JSON.parse(m[0]);
  if (j._tag === 'Error') throw new Error(`CLI: ${j.error?.message ?? 'desconocido'}`);
  return j.rows ?? [];
}

const tmpSql = join(tmpdir(), `pushrot-${Date.now()}.sql`);
const tmpEnv = join(tmpdir(), `pushrot-${Date.now()}.env`);
try {
  const secret = randomBytes(32).toString('hex');

  const idRows = parseRows(run(['db', 'query', '--linked', `SELECT id FROM vault.secrets WHERE name='${VAULT_NAME}';`]).out);
  if (idRows.length === 0) throw new Error(`No existe el secreto '${VAULT_NAME}' en Vault`);
  const secretId = idRows[0].id;

  writeFileSync(tmpSql, `SELECT vault.update_secret('${secretId}'::uuid, '${secret}');`);
  const upd = run(['db', 'query', '--linked', '-f', tmpSql]);
  parseRows(upd.out);
  console.log('OK Vault actualizado');

  writeFileSync(tmpEnv, `${FN_SECRET}=${secret}\n`);
  const set = run(['secrets', 'set', '--env-file', tmpEnv]);
  if (set.code !== 0) throw new Error(`secrets set fallo (exit ${set.code}): ${set.out.slice(0, 200)}`);
  console.log('OK secreto de Edge Function actualizado');
  console.log('Rotacion completa. Verifica con pruebas (401 sin secreto / secreto incorrecto).');
} finally {
  rmSync(tmpSql, { force: true });
  rmSync(tmpEnv, { force: true });
}
