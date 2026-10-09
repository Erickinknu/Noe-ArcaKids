// Pruebas send-push con dos usuarios (A/B), familias distintas.
// Lee claves de .env y el secreto de Vault (via CLI); nunca imprime valores.
// Casos: sin secreto -> 401; JWT de A sin secreto -> 401; secreto mal -> 401;
// secreto + user_ids extrano -> ignorado (push solo al destinatario real);
// secreto + notification_id valido -> 200; reintento -> duplicate (no reenvia).
// Limpieza: borra tokens, notificaciones, perfiles, familias y usuarios; conteos en 0.
// Uso: node scripts/test-push-ab.mjs
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = 'C:\\Users\\Usuario\\Documents\\noe-arcakids';
let failures = 0;
function check(nombre, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${nombre}`);
  if (!cond) failures += 1;
}

function envVal(path, key) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(new RegExp(`^${key}=(.*)$`));
    if (m) return m[1].trim();
  }
  throw new Error(`Falta ${key}`);
}
function cli(args) {
  const cmd = `supabase ${args.map((a) => `"${a.replace(/"/g, '""')}"`).join(' ')}`;
  try {
    return execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd: ROOT,
    });
  } catch (e) { throw new Error(`CLI fallo: ${(e.stdout ?? '').slice(0, 200)}`); }
}
function dbRows(sql) {
  const tmp = join(tmpdir(), `pushtest-${Date.now()}-${Math.floor(Math.random() * 1e6)}.sql`);
  try {
    writeFileSync(tmp, sql);
    const out = cli(['db', 'query', '--linked', '-f', tmp]);
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('CLI sin JSON');
    const j = JSON.parse(m[0]);
    if (j._tag === 'Error') throw new Error(`DB: ${j.error?.message}`);
    return j.rows ?? [];
  } finally { rmSync(tmp, { force: true }); }
}

const SUPABASE_URL = envVal(join(ROOT, '.env'), 'SUPABASE_URL');
const ANON = envVal(join(ROOT, 'apps/noe/.env'), 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
const SERVICE = envVal(join(ROOT, '.env'), 'SUPABASE_SECRET_KEY');
const FN_URL = `${SUPABASE_URL}/functions/v1/send-push`;

async function rest(path, { token, apikeyOnly = false } = {}, body) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON };
  if (token) headers.Authorization = `Bearer ${token}`;
  else if (!apikeyOnly) headers.Authorization = `Bearer ${ANON}`;
  const r = await fetch(`${SUPABASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
  let j = null; try { j = await r.json(); } catch { /* no-json */ }
  return { http: r.status, json: j };
}
async function svc(path, method, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j = null; try { j = await r.json(); } catch { /* noop */ }
  return { http: r.status, json: j };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TS = Date.now();
const users = {};
for (const tag of ['A', 'B']) {
  const email = `pushtest.${tag}.${TS}@example.com`;
  const pass = `Pt-${TS}-${tag}-Zz9!xQ`;
  let r = await rest('/auth/v1/signup', {}, { email, password: pass });
  let uid = r.json?.user?.id, token = r.json?.access_token;
  if (!token) {
    const l = await rest('/auth/v1/token?grant_type=password', {}, { email, password: pass });
    token = l.json?.access_token; uid = l.json?.user?.id;
  }
  if (!uid || !token) throw new Error(`No se pudo crear/loguear usuario ${tag} (http=${r.http})`);
  users[tag] = { email, uid, token };
}
check('usuarios A y B creados (familias distintas)', users.A.uid !== users.B.uid);
const profs = dbRows(`SELECT user_id, family_id FROM public.profiles WHERE user_id IN ('${users.A.uid}','${users.B.uid}');`);
for (const p of profs) users[Object.keys(users).find((k) => users[k].uid === p.user_id)].fam = p.family_id;
check('perfiles con familia asignada y distinta', !!users.A.fam && !!users.B.fam && users.A.fam !== users.B.fam);

// Secreto real desde Vault (nunca se imprime).
const srows = dbRows(`SELECT decrypted_secret AS s FROM vault.decrypted_secrets WHERE name='push_admin_secret' LIMIT 1;`);
const SECRET = srows[0]?.s;
check('secreto leido de Vault', typeof SECRET === 'string' && SECRET.length >= 16);

// Llamada a la funcion con variantes de auth.
async function callFn({ secret, userToken, body }) {
  const headers = { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${userToken ?? ANON}` };
  if (secret) headers['x-push-secret'] = secret;
  const r = await fetch(FN_URL, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
  let j = null; try { j = await r.json(); } catch { /* noop */ }
  return { http: r.status, json: j };
}

// Tokens push falsos pero con formato valido (uno por usuario).
const tokA = `ExponentPushToken[testA${TS}]`;
const tokB = `ExponentPushToken[testB${TS}]`;
await svc('/push_tokens', 'POST', { user_id: users.A.uid, token: tokA });
await svc('/push_tokens', 'POST', { user_id: users.B.uid, token: tokB });

// N1 para A sin necesidad de llamada directa: el trigger debe reclamarla solo.
const n1 = await svc('/notifications', 'POST', {
  user_id: users.A.uid, family_id: users.A.fam, type: 'system', title: 'T1', body: 'B1', data: {},
});
const n1id = n1.json?.[0]?.id;
check('notificacion N1 creada para A', typeof n1id === 'string');
let pushed = null;
for (let i = 0; i < 12; i++) {
  await sleep(5000);
  const q = await svc(`/notifications?id=eq.${n1id}&select=pushed_at`, 'GET');
  pushed = q.json?.[0]?.pushed_at ?? null;
  if (pushed) break;
}
check('trigger disparo la funcion (pushed_at marcado, secreto de Vault valido)', pushed !== null);

// 401: sin secreto, con JWT valido de A (pasa verify_jwt, frena en x-push-secret).
const c1 = await callFn({ body: { notification_id: n1id } });
check('sin secreto -> 401', c1.http === 401);
const c2 = await callFn({ userToken: users.A.token, body: { notification_id: n1id } });
check('JWT de A sin secreto -> 401', c2.http === 401);
const c3 = await callFn({ secret: 'secreto-incorrecto', body: { notification_id: n1id } });
check('secreto incorrecto -> 401', c3.http === 401);

// N2 para A: llamada directa con user_ids de B -> debe ignorarlo.
const n2 = await svc('/notifications', 'POST', {
  user_id: users.A.uid, family_id: users.A.fam, type: 'system', title: 'T2', body: 'B2', data: {},
});
const n2id = n2.json?.[0]?.id;
const c4 = await callFn({ secret: SECRET, body: { notification_id: n2id, user_ids: [users.B.uid], title: 'SUPLANTADO', body: 'TEXTO ARBITRARIO' } });
// Carrera posible con el trigger: ambos resultados son validos, ninguno toca a B.
const c4ok = (c4.http === 200 && (c4.json?.sent === 1 || c4.json?.duplicate === true));
check('secreto+user_ids ajeno -> solo destinatario real o ya reclamado por trigger', c4ok);
const c5 = await callFn({ secret: SECRET, body: { notification_id: n2id } });
check('reintento no reenvia (duplicate)', c5.http === 200 && c5.json?.duplicate === true && c5.json?.sent === 0);
// B nunca fue objetivo: su token falso sigue intacto.
const tb = await svc(`/push_tokens?user_id=eq.${users.B.uid}&select=token`, 'GET');
check('token de B intacto (ningun envio lo toco)', Array.isArray(tb.json) && tb.json.some((r) => r.token === tokB));
// ID inexistente -> 404.
const c6 = await callFn({ secret: SECRET, body: { notification_id: '00000000-0000-0000-0000-000000000000' } });
check('notification_id inexistente -> 404', c6.http === 404);

// Limpieza.
const ids = [users.A.uid, users.B.uid].map((u) => `'${u}'`).join(',');
dbRows(`DELETE FROM public.push_tokens WHERE user_id IN (${ids});`);
dbRows(`DELETE FROM public.notifications WHERE user_id IN (${ids});`);
const fams = [`'${users.A.fam}'`, `'${users.B.fam}'`].join(',');
if (fams) dbRows(`DELETE FROM public.subscriptions WHERE family_id IN (${fams});`);
if (fams) dbRows(`DELETE FROM public.families WHERE id IN (${fams});`);
dbRows(`DELETE FROM public.profiles WHERE user_id IN (${ids});`);
dbRows(`DELETE FROM auth.identities WHERE user_id IN (${ids});`);
dbRows(`DELETE FROM auth.users WHERE id IN (${ids});`);
const left = dbRows(`SELECT (SELECT COUNT(*) FROM public.push_tokens WHERE user_id IN (${ids})) AS t, (SELECT COUNT(*) FROM public.notifications WHERE user_id IN (${ids})) AS n, (SELECT COUNT(*) FROM auth.users WHERE id IN (${ids})) AS u;`)[0];
check('conteos en 0 tras limpieza', String(left.t) === '0' && String(left.n) === '0' && String(left.u) === '0');

console.log(failures === 0 ? 'TODAS LAS PRUEBAS PASARON' : `FALLOS: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
