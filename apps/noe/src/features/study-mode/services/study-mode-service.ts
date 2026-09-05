import { storage } from '@noe-arcakids/storage';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface StudySchedule {
  enabled: boolean;
  hours: { start: string; end: string }[];
  days: string[];
  blockedPackages?: string[];
}

const STORAGE_KEY = 'study_mode';
const DEFAULT_BLOCKED = [
  'com.zhiliaoapp.musically',
  'com.instagram.android',
  'com.google.android.youtube',
  'com.facebook.katana',
  'com.snapchat.android',
  'com.discord',
  'com.twitch.android.app',
];

export const studyModeService = {
  async getSchedule(childId?: string): Promise<StudySchedule> {
    if (childId) {
      try {
        const client = requireSupabaseClient();
        const { data, error } = await client.rpc('get_study_mode_schedule', {
          p_child_id: childId,
        });
        if (!error && data) {
          return {
            enabled: Boolean(data.enabled),
            days: (data.days as string[]) ?? [],
            hours: (data.hours as { start: string; end: string }[]) ?? [],
            blockedPackages: (data.blocked_packages as string[]) ?? DEFAULT_BLOCKED,
          };
        }
      } catch {
        // Fall through to local cache
      }
    }
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) {
      return { enabled: false, hours: [], days: [], blockedPackages: DEFAULT_BLOCKED };
    }
    try {
      return JSON.parse(raw) as StudySchedule;
    } catch {
      return { enabled: false, hours: [], days: [], blockedPackages: DEFAULT_BLOCKED };
    }
  },

  async saveSchedule(schedule: StudySchedule, childId?: string): Promise<void> {
    await storage.save(STORAGE_KEY, JSON.stringify(schedule));

    if (childId) {
      try {
        const client = requireSupabaseClient();
        await client.rpc('upsert_study_mode_schedule', {
          p_child_id: childId,
          p_enabled: schedule.enabled,
          p_blocked_packages: JSON.stringify(schedule.blockedPackages ?? DEFAULT_BLOCKED),
          p_days: JSON.stringify(schedule.days),
          p_hours: JSON.stringify(schedule.hours),
        });
      } catch {
        // Best-effort backend sync
      }
    }
  },
};
