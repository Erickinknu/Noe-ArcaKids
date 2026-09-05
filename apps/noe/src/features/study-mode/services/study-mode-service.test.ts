import { studyModeService } from './study-mode-service';
import { storage } from '@noe-arcakids/storage';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(),
}));

jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    get: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockedGet = jest.mocked(storage.get);
const mockedSave = jest.mocked(storage.save);

describe('studyModeService.getSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a disabled schedule with the default blocked apps when nothing is stored', async () => {
    mockedGet.mockResolvedValueOnce(null);

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(false);
    expect(schedule.days).toEqual([]);
    expect(schedule.hours).toEqual([]);
    expect(schedule.blockedPackages).toEqual([
      'com.zhiliaoapp.musically',
      'com.instagram.android',
      'com.google.android.youtube',
      'com.facebook.katana',
      'com.snapchat.android',
      'com.discord',
      'com.twitch.android.app',
    ]);
  });

  it('restores a previously persisted schedule from local storage', async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        enabled: true,
        days: ['mon', 'wed'],
        hours: [{ start: '18:00', end: '20:00' }],
      })
    );

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(true);
    expect(schedule.days).toEqual(['mon', 'wed']);
    expect(schedule.hours).toEqual([{ start: '18:00', end: '20:00' }]);
  });

  it('falls back to defaults when persisted JSON is corrupted', async () => {
    mockedGet.mockResolvedValueOnce('not-json{');

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(false);
    expect(schedule.days).toEqual([]);
  });
});

describe('studyModeService.saveSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists the schedule to local storage', async () => {
    mockedSave.mockResolvedValueOnce(undefined);

    await studyModeService.saveSchedule({
      enabled: true,
      days: ['tue'],
      hours: [{ start: '17:00', end: '19:00' }],
    });

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(
      'study_mode',
      expect.stringContaining('"enabled":true')
    );
  });

  it('does not call the backend when there is no child id', async () => {
    mockedSave.mockResolvedValueOnce(undefined);

    await studyModeService.saveSchedule({
      enabled: true,
      days: [],
      hours: [],
    });

    expect(requireSupabaseClient).not.toHaveBeenCalled();
  });
});