import { storage } from '@noe-arcakids/storage';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

const PIN_KEY = 'arcakids/family-pin';

export interface FamilyPin {
  salt: string;
  pinHash: string;
}

export const familyPinRepository = {
  async getCachedPin(): Promise<FamilyPin | null> {
    const raw = await storage.get(PIN_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as FamilyPin;
      if (parsed.salt && parsed.pinHash) return parsed;
    } catch {
      // Ignore malformed caches.
    }
    return null;
  },

  async setCachedPin(pin: FamilyPin): Promise<void> {
    await storage.save(PIN_KEY, JSON.stringify(pin));
  },

  async fetchPin(deviceUuid: string): Promise<FamilyPin | null> {
    try {
      const client = requireSupabaseClient();
      const { data, error } = await client.rpc('get_family_device_pin', {
        p_device_uuid: deviceUuid,
      });
      if (error) return null;
      const row = (Array.isArray(data) ? data[0] : null) as
        | { salt?: string; pin_hash?: string }
        | null;
      if (!row?.salt || !row?.pin_hash) return null;
      return { salt: row.salt, pinHash: row.pin_hash };
    } catch {
      return null;
    }
  },
};