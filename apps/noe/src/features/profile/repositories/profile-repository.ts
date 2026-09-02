import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export const profileRepository = {
  async updateDisplayName(profileId: string, displayName: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('id', profileId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async updateBlockInstalls(profileId: string, blockInstalls: boolean): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('profiles')
      .update({ block_installs: blockInstalls, updated_at: new Date().toISOString() })
      .eq('id', profileId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async getBlockInstalls(profileId: string): Promise<boolean> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select('block_installs')
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return Boolean((data as { block_installs?: boolean } | null)?.block_installs);
  },
};