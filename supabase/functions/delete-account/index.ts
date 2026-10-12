// Edge Function: delete-account
// Borra la cuenta del usuario autenticado (spec §10). Requiere JWT válido
// (verify_jwt = true). Usa service_role SOLO en el servidor para:
//   1. Localizar el perfil/familia del usuario.
//   2. Si es el único perfil de la familia, borrar la familia (cascada de hijos,
//      dispositivos, suscripciones, etc.). Si hay más perfiles, borrar solo su
//      perfil para no dejar huérfana la familia de otros responsables.
//   3. Borrar el usuario de auth (admin API).
//
// No devuelve datos personales; solo { ok } o un código de error.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return json({ error: 'missing_token' }, 401);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: 'invalid_token' }, 401);
  }
  const userId = userData.user.id;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, family_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError) {
    return json({ error: 'lookup_failed', detail: profileError.message }, 500);
  }

  if (profile?.family_id) {
    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', profile.family_id)
      .neq('id', profile.id);

    if (countError) {
      return json({ error: 'lookup_failed', detail: countError.message }, 500);
    }

    if (!count || count === 0) {
      // Único perfil de la familia: se borra la familia completa (cascada).
      const { error: familyError } = await admin
        .from('families')
        .delete()
        .eq('id', profile.family_id);
      if (familyError) {
        return json({ error: 'delete_family_failed', detail: familyError.message }, 500);
      }
    } else {
      // Hay otros responsables: solo se elimina este perfil.
      const { error: profileDeleteError } = await admin
        .from('profiles')
        .delete()
        .eq('id', profile.id);
      if (profileDeleteError) {
        return json({ error: 'delete_profile_failed', detail: profileDeleteError.message }, 500);
      }
    }
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    return json({ error: 'delete_user_failed', detail: deleteUserError.message }, 500);
  }

  return json({ ok: true });
});
