import { storage } from '@noe-arcakids/storage';

export interface StudySchedule {
  enabled: boolean;
  hours: { start: string; end: string }[];
  days: string[];
}

const STORAGE_KEY = 'study_mode';

export const studyModeService = {
  async getSchedule(): Promise<StudySchedule> {
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) {
      return { enabled: false, hours: [], days: [] };
    }
    try {
      return JSON.parse(raw) as StudySchedule;
    } catch {
      return { enabled: false, hours: [], days: [] };
    }
  },

  async saveSchedule(schedule: StudySchedule): Promise<void> {
    await storage.save(STORAGE_KEY, JSON.stringify(schedule));
  },
};
