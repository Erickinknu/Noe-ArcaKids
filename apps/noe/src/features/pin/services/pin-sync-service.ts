import { requireSupabaseClient } from '@noe-arcakids/supabase';

import { familyService } from '@/features/family/services/family-service';
import { pinService } from '@/features/pin/services/pin-service';

/**
 * Best-effort sync of the parent PIN (salted hash) to every device of the
 * family, so ARCA KIDS can protect sensitive actions. Failures are swallowed:
 * the PIN stays valid locally in NOE regardless.
 */
export const pinSyncService = {
  /**
   * Re-pushes the current PIN to every linked device. Called whenever NOE is
   * opened, so a device that linked AFTER the PIN was created picks it up on
   * the next launch instead of staying unprotected silently.
   */
  async syncCurrentPin(): Promise<void> {
    const config = await pinService.getConfig();
    if (!config?.enabled) return;
    await this.pushPinToFamily(config.salt, config.pinHash);
  },

  async pushPinToFamily(salt: string, pinHash: string): Promise<void> {
    try {
      const { family } = await familyService.getMyFamily();
      if (!family.id) return;
      const client = requireSupabaseClient();
      const { data } = await client
        .from('devices')
        .select('device_uuid')
        .eq('family_id', family.id);
      const rows = (data ?? []) as { device_uuid?: string | null }[];
      await Promise.allSettled(
        rows.map((row) =>
          row.device_uuid
            ? client.rpc('set_family_device_pin', {
                p_device_uuid: row.device_uuid,
                p_salt: salt,
                p_pin_hash: pinHash,
              })
            : Promise.resolve()
        )
      );
    } catch {
      // Offline or not linked yet: devices will pick the PIN up when NOE pushes again.
    }
  },

  async clearPinFromFamily(): Promise<void> {
    try {
      const { family } = await familyService.getMyFamily();
      if (!family.id) return;
      const client = requireSupabaseClient();
      const { data } = await client
        .from('devices')
        .select('device_uuid')
        .eq('family_id', family.id);
      const rows = (data ?? []) as { device_uuid?: string | null }[];
      await Promise.allSettled(
        rows.map((row) =>
          row.device_uuid
            ? client.rpc('clear_family_device_pin', { p_device_uuid: row.device_uuid })
            : Promise.resolve()
        )
      );
    } catch {
      // Offline: nothing to do, the hash remains until the next successful clear.
    }
  },
};