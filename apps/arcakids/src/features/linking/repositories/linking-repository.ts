import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import type { LocalDevice } from '../../identity/repositories/identity-repository';

export interface RedeemResult {
  childId: string;
  displayName: string;
  avatarUrl: string | null;
  familyId: string;
}

interface RedeemRow {
  child_id: string;
  display_name: string;
  avatar_url: string | null;
  family_id: string;
}

export const linkingRepository = {
  async redeem(code: string, device: LocalDevice): Promise<RedeemResult> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('redeem_pairing_code', {
      p_code: code,
      p_device_uuid: device.deviceUuid,
      p_device_name: device.name,
      p_platform: device.platform,
    });

    if (error) {
      throw new DatabaseError(error.message);
    }
    const rows = (data ?? []) as RedeemRow[];
    const row = rows[0];
    if (!row) {
      throw new DatabaseError('The code could not be redeemed.');
    }
    return {
      childId: row.child_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      familyId: row.family_id,
    };
  },
};