import { studyModeService, DEFAULT_BLOCKED_PACKAGES } from './study-mode-service';
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
const mockedRequireClient = jest.mocked(requireSupabaseClient);

function mockBackend(data: unknown, error: unknown = null) {
  const rpc = jest.fn().mockResolvedValue({ data, error });
  mockedRequireClient.mockReturnValue({ rpc } as never);
  return rpc;
}

const PER_DAY = {
  mon: { start: '08:00', end: '14:00' },
  tue: { start: '16:00', end: '19:00' },
};

describe('studyModeService.getSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a disabled schedule with the default blocked apps when nothing is stored', async () => {
    mockedGet.mockResolvedValueOnce(null);

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(false);
    expect(schedule.days).toEqual([]);
    expect(schedule.hours).toEqual({});
    expect(schedule.blockedPackages).toEqual(DEFAULT_BLOCKED_PACKAGES);
  });

  it('restores a previously persisted schedule from local storage', async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        enabled: true,
        days: ['mon', 'wed'],
        hours: PER_DAY,
      })
    );

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(true);
    expect(schedule.days).toEqual(['mon', 'wed']);
    expect(schedule.hours).toEqual(PER_DAY);
  });

  it('falls back to defaults when persisted JSON is corrupted', async () => {
    mockedGet.mockResolvedValueOnce('not-json{');

    const schedule = await studyModeService.getSchedule();

    expect(schedule.enabled).toBe(false);
    expect(schedule.days).toEqual([]);
  });

  // Legacy shape: a single window that used to be applied to every active day.
  it('migrates a legacy single-window hours array into a per-day map', async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        enabled: true,
        days: ['mon', 'wed'],
        hours: [{ start: '18:00', end: '20:00' }],
      })
    );

    const schedule = await studyModeService.getSchedule();

    expect(schedule.hours).toEqual({
      mon: { start: '18:00', end: '20:00' },
      wed: { start: '18:00', end: '20:00' },
    });
  });

  it('drops legacy days that are not valid weekdays', async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({
        enabled: true,
        days: ['lun', 'mon', 'notaday'],
        hours: PER_DAY,
      })
    );

    const schedule = await studyModeService.getSchedule();

    expect(schedule.days).toEqual(['mon']);
  });

  it('reads per-day hours from the backend', async () => {
    mockBackend({
      enabled: true,
      days: ['mon', 'tue'],
      hours: PER_DAY,
      blocked_packages: ['com.a'],
    });

    const schedule = await studyModeService.getSchedule('child-1');

    expect(schedule.enabled).toBe(true);
    expect(schedule.days).toEqual(['mon', 'tue']);
    expect(schedule.hours).toEqual(PER_DAY);
    expect(schedule.blockedPackages).toEqual(['com.a']);
  });

  // The parent app used to send JSON.stringify(...) into jsonb columns, which
  // stored a JSON *string*. Reads must survive that legacy shape.
  it('parses a double-encoded hours payload coming from the backend', async () => {
    mockBackend({
      enabled: true,
      days: '["mon"]',
      hours: JSON.stringify(PER_DAY),
      blocked_packages: '["com.a"]',
    });

    const schedule = await studyModeService.getSchedule('child-1');

    expect(schedule.days).toEqual(['mon']);
    expect(schedule.hours).toEqual(PER_DAY);
    expect(schedule.blockedPackages).toEqual(['com.a']);
  });

  it('falls back to local storage when the backend call fails', async () => {
    mockedGet.mockResolvedValueOnce(
      JSON.stringify({ enabled: true, days: ['mon'], hours: PER_DAY })
    );
    const rpc = jest.fn().mockRejectedValue(new Error('network down'));
    mockedRequireClient.mockReturnValue({ rpc } as never);

    const schedule = await studyModeService.getSchedule('child-1');

    expect(schedule.enabled).toBe(true);
    expect(schedule.hours).toEqual(PER_DAY);
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
      hours: { tue: { start: '17:00', end: '19:00' } },
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
      hours: {},
    });

    expect(mockedRequireClient).not.toHaveBeenCalled();
  });

  // Core bug: jsonb parameters were sent as JSON strings, so Supabase stored a
  // JSON string inside the column instead of an array/object.
  it('sends jsonb parameters as native arrays and objects, never as JSON strings', async () => {
    const rpc = mockBackend(null);
    mockedSave.mockResolvedValueOnce(undefined);

    await studyModeService.saveSchedule(
      {
        enabled: true,
        days: ['mon', 'tue'],
        hours: PER_DAY,
        blockedPackages: ['com.a', 'com.b'],
      },
      'child-1'
    );

    expect(rpc).toHaveBeenCalledWith('upsert_study_mode_schedule', {
      p_child_id: 'child-1',
      p_enabled: true,
      p_days: ['mon', 'tue'],
      p_hours: PER_DAY,
      p_blocked_packages: ['com.a', 'com.b'],
    });

    const payload = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(typeof payload.p_days).not.toBe('string');
    expect(typeof payload.p_hours).not.toBe('string');
    expect(typeof payload.p_blocked_packages).not.toBe('string');
    expect(Array.isArray(payload.p_days)).toBe(true);
    expect(Array.isArray(payload.p_blocked_packages)).toBe(true);
    expect(typeof payload.p_hours).toBe('object');
  });

  it('keeps the selected blocked packages instead of falling back to defaults', async () => {
    const rpc = mockBackend(null);
    mockedSave.mockResolvedValueOnce(undefined);

    await studyModeService.saveSchedule(
      { enabled: true, days: ['mon'], hours: PER_DAY, blockedPackages: ['com.solo.esta'] },
      'child-1'
    );

    const payload = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.p_blocked_packages).toEqual(['com.solo.esta']);
  });

  it('sends an empty object for hours when no window is configured', async () => {
    const rpc = mockBackend(null);
    mockedSave.mockResolvedValueOnce(undefined);

    await studyModeService.saveSchedule(
      { enabled: true, days: ['mon'], hours: {} },
      'child-1'
    );

    const payload = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.p_hours).toEqual({});
  });

  it('surfaces a backend failure to the caller instead of pretending it saved', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'NOT_AUTHORIZED' } });
    mockedRequireClient.mockReturnValue({ rpc } as never);
    mockedSave.mockResolvedValueOnce(undefined);

    await expect(
      studyModeService.saveSchedule(
        { enabled: true, days: ['mon'], hours: PER_DAY },
        'child-1'
      )
    ).rejects.toThrow('NOT_AUTHORIZED');
  });
});
