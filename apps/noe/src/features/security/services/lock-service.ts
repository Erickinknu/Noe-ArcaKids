import { storage } from '@noe-arcakids/storage';

const INACTIVITY_KEY = 'security/inactivity_minutes';
const HIDE_PREVIEW_KEY = 'security/hide_preview';

export type InactivityMinutes = 0 | 1 | 5 | 15;

export const INACTIVITY_OPTIONS: InactivityMinutes[] = [0, 1, 5, 15];

export const lockService = {
  async getInactivityMinutes(): Promise<InactivityMinutes> {
    const raw = await storage.get(INACTIVITY_KEY);
    const value = raw ? Number.parseInt(raw, 10) : NaN;
    if (INACTIVITY_OPTIONS.includes(value as InactivityMinutes)) {
      return value as InactivityMinutes;
    }
    return 1;
  },

  async setInactivityMinutes(minutes: InactivityMinutes): Promise<void> {
    await storage.save(INACTIVITY_KEY, String(minutes));
  },

  async isHidePreviewEnabled(): Promise<boolean> {
    return (await storage.get(HIDE_PREVIEW_KEY)) === 'true';
  },

  async setHidePreviewEnabled(enabled: boolean): Promise<void> {
    await storage.save(HIDE_PREVIEW_KEY, enabled ? 'true' : 'false');
  },
};
