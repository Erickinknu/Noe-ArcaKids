import { UnknownError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

/**
 * Borrado de cuenta (spec §10). Invoca la Edge Function `delete-account`
 * (service_role en servidor): borra la familia si el usuario es el único
 * perfil, o solo su perfil si hay más responsables, y elimina el usuario.
 */
export const accountService = {
  async deleteAccount(): Promise<void> {
    const client = requireSupabaseClient();
    const { data, error } = await client.functions.invoke('delete-account', {
      method: 'POST',
    });
    if (error) {
      throw new UnknownError(error.message || 'delete-account failed');
    }
    if (!data || (data as { ok?: boolean }).ok !== true) {
      throw new UnknownError('delete-account failed');
    }
  },
};
