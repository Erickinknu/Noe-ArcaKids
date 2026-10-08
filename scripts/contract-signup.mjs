// Contrato: el registro no debe romperse en silencio.
// Hace signup real contra el proyecto (dev) y falla si cualquier paso da error:
// signup -> login -> claim free (prueba que handle_new_user creo familia+perfil)
// -> get_my_subscription -> get_family_plan_limits (debe ser free).
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run test:contract
// El usuario de prueba (contract.<ts>@example.com) no se puede borrar sin
// service_role: limpiarlo con SQL (ver QUERIES_LIMPIEZA abajo).
const BASE = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!BASE || !ANON) {
  console.error('Falta SUPABASE_URL o SUPABASE_ANON_KEY en el entorno.');
  process.exit(2);
}
const TS = Date.now();
const EMAIL = `contract.${TS}@example.com`;
const PASS = `Ct-${TS}-Zz9!xQ`;
let failures = 0;
function check(nombre, cond, detalle) {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${nombre}${detalle ? ' :: ' + detalle : ''}`);
  if (!cond) failures += 1;
}
async function post(path, token, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch { json = null; }
  return { http: r.status, json };
}
const r1 = await post('/auth/v1/signup', null, { email: EMAIL, password: PASS });
const uid = r1.json && r1.json.user && r1.json.user.id;
check('signup crea usuario', r1.http === 200 && !!uid, `http=${r1.http} ${(r1.json && (r1.json.msg || r1.json.message)) || ''}`);
if (!uid) { console.log(`Limpieza: no hay usuario que borrar.`); process.exit(1); }
const r2 = await post('/auth/v1/token?grant_type=password', null, { email: EMAIL, password: PASS });
const token = r2.json && r2.json.access_token;
check('login con password', r2.http === 200 && !!token, `http=${r2.http}`);
if (!token) process.exit(1);
const r3 = await post('/rest/v1/rpc/claim_subscription', token, { p_plan: 'free' });
const fam = r3.json && r3.json.family_id;
check('claim free (familia+perfil auto-creados)', r3.http === 200 && !!fam, `http=${r3.http} ${(r3.json && r3.json.message) || ''}`);
const r4 = await post('/rest/v1/rpc/get_my_subscription', token, {});
check('get_my_subscription responde sin error', r4.http === 200 && Array.isArray(r4.json), `http=${r4.http}`);
if (fam) {
  const r5 = await post('/rest/v1/rpc/get_family_plan_limits', token, { _family_id: fam });
  const row = r5.json && r5.json[0];
  check('limits devuelven plan free', r5.http === 200 && row && row.slug === 'free', `http=${r5.http} slug=${row && row.slug}`);
}
console.log(`Usuario de prueba: ${EMAIL} (${uid}) familia=${fam || '?'}`);
console.log(`QUERIES_LIMPIEZA (service_role): delete from public.subscriptions where family_id='${fam}'; delete from public.profiles where user_id='${uid}'; delete from public.families where id='${fam}'; delete from auth.identities where user_id='${uid}'; delete from auth.users where id='${uid}';`);
process.exit(failures === 0 ? 0 : 1);
