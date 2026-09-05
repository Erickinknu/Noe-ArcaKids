import {
  activityService,
  CATEGORY_PACKAGES,
  localDateKey,
  type ActivityCategory,
} from './activity-service';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(),
}));

describe('localDateKey', () => {
  it('formats a date as YYYY-MM-DD with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('keeps months and days with two digits', () => {
    expect(localDateKey(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
});

describe('CATEGORY_PACKAGES', () => {
  const categories: ActivityCategory[] = [
    'web',
    'youtube',
    'social',
    'media',
    'conversations',
    'games',
  ];

  it('defines every activity category', () => {
    for (const category of categories) {
      expect(Array.isArray(CATEGORY_PACKAGES[category])).toBe(true);
    }
  });

  it('uses non-empty, well-formed package ids', () => {
    for (const category of Object.keys(CATEGORY_PACKAGES) as ActivityCategory[]) {
      for (const pkg of CATEGORY_PACKAGES[category]) {
        expect(typeof pkg).toBe('string');
        expect(pkg.length).toBeGreaterThan(0);
        expect(pkg).toContain('.');
      }
    }
  });

  it('has no duplicate package ids within a category', () => {
    for (const category of Object.keys(CATEGORY_PACKAGES) as ActivityCategory[]) {
      const ids = CATEGORY_PACKAGES[category];
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('activityService.getChildUsageByCategory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('filters package usage to the requested category and recomputes the total', async () => {
    jest.spyOn(activityService, 'getChildUsageByPackage').mockResolvedValueOnce({
      childId: 'child-1',
      childName: 'Leo',
      packageUsages: [
        { packageName: 'com.google.android.youtube', minutes: 30 },
        { packageName: 'com.instagram.android', minutes: 25 },
        { packageName: 'com.whatsapp', minutes: 10 },
      ],
      totalMinutes: 65,
    });

    const result = await activityService.getChildUsageByCategory('child-1', 'social', 7);

    expect(result.packageUsages).toEqual([
      { packageName: 'com.instagram.android', minutes: 25 },
    ]);
    expect(result.totalMinutes).toBe(25);
  });

  it('keeps every package when the games category is queried (empty allowlist)', async () => {
    jest.spyOn(activityService, 'getChildUsageByPackage').mockResolvedValueOnce({
      childId: 'child-1',
      childName: 'Leo',
      packageUsages: [{ packageName: 'org.example.mygame', minutes: 12 }],
      totalMinutes: 12,
    });

    const result = await activityService.getChildUsageByCategory('child-1', 'games', 7);

    expect(result.totalMinutes).toBe(0);
    expect(result.packageUsages).toEqual([]);
  });
});