import { storage } from '@noe-arcakids/storage';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export type StudyWeekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface StudyDayWindow {
  start: string;
  end: string;
}

export interface StudySchedule {
  enabled: boolean;
  days: StudyWeekday[];
  hours: Partial<Record<StudyWeekday, StudyDayWindow>>;
  blockedPackages?: string[];
}

export const DEFAULT_BLOCKED_PACKAGES: string[] = [
  'com.zhiliaoapp.musically',
  'com.instagram.android',
  'com.google.android.youtube',
  'com.facebook.katana',
  'com.snapchat.android',
  'com.discord',
  'com.twitch.android.app',
];

const WEEKDAYS: StudyWeekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const STORAGE_KEY = 'study_mode';

function defaultSchedule(): StudySchedule {
  return { enabled: false, days: [], hours: {}, blockedPackages: DEFAULT_BLOCKED_PACKAGES };
}

// The parent app used to send JSON.stringify(...) for jsonb parameters, which
// made Postgres store a JSON *string* inside the column. Accept both shapes.
function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeDays(value: unknown): StudyWeekday[] {
  const valid = asArray(value).filter(
    (d): d is StudyWeekday => typeof d === 'string' && WEEKDAYS.includes(d as StudyWeekday)
  );
  return Array.from(new Set(valid));
}

function toWindow(value: unknown): StudyDayWindow | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const window = value as Record<string, unknown>;
  const start = window.start;
  const end = window.end;
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  if (!/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) return null;
  return { start, end };
}

// New shape: one window per weekday. Legacy shape: a single window that was
// implicitly applied to every active day, which is expanded here so nothing
// silently changes meaning.
function normalizeHours(
  value: unknown,
  days: StudyWeekday[]
): Partial<Record<StudyWeekday, StudyDayWindow>> {
  const result: Partial<Record<StudyWeekday, StudyDayWindow>> = {};

  if (Array.isArray(value)) {
    const legacy = toWindow(value[0]);
    if (legacy) for (const day of days) result[day] = legacy;
    return result;
  }

  if (typeof value === 'string') {
    try {
      return normalizeHours(JSON.parse(value), days);
    } catch {
      return result;
    }
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!WEEKDAYS.includes(key as StudyWeekday)) continue;
      const window = toWindow(entry);
      if (window) result[key as StudyWeekday] = window;
    }
  }

  return result;
}

function normalizeBlockedPackages(value: unknown): string[] {
  const packages = asArray(value).filter(
    (p): p is string => typeof p === 'string' && p.length > 0
  );
  return packages.length > 0 ? Array.from(new Set(packages)) : DEFAULT_BLOCKED_PACKAGES;
}

function normalizeSchedule(raw: unknown): StudySchedule {
  if (!raw || typeof raw !== 'object') return defaultSchedule();
  const record = raw as Record<string, unknown>;
  const days = normalizeDays(record.days);
  return {
    enabled: Boolean(record.enabled),
    days,
    hours: normalizeHours(record.hours, days),
    blockedPackages: normalizeBlockedPackages(
      record.blockedPackages ?? record.blocked_packages
    ),
  };
}

export const studyModeService = {
  async getSchedule(childId?: string): Promise<StudySchedule> {
    if (childId) {
      try {
        const client = requireSupabaseClient();
        const { data, error } = await client.rpc('get_study_mode_schedule', {
          p_child_id: childId,
        });
        if (error) throw new Error(error.message);
        if (data) return normalizeSchedule(data);
      } catch {
        // Offline or backend unavailable: fall back to the local cache.
      }
    }

    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return defaultSchedule();
    try {
      return normalizeSchedule(JSON.parse(raw));
    } catch {
      return defaultSchedule();
    }
  },

  async saveSchedule(schedule: StudySchedule, childId?: string): Promise<void> {
    const normalized = normalizeSchedule(schedule);
    await storage.save(STORAGE_KEY, JSON.stringify(normalized));

    if (!childId) return;

    // jsonb parameters must be sent as native arrays/objects. Wrapping them in
    // JSON.stringify stores a JSON string inside the column and the child device
    // then reads a string instead of a schedule.
    const client = requireSupabaseClient();
    const { error } = await client.rpc('upsert_study_mode_schedule', {
      p_child_id: childId,
      p_enabled: normalized.enabled,
      p_blocked_packages: normalized.blockedPackages,
      p_days: normalized.days,
      p_hours: normalized.hours,
    });

    // Surface the failure: silently swallowing it made the UI claim success
    // while the child device kept the old schedule.
    if (error) throw new Error(error.message);
  },
};
