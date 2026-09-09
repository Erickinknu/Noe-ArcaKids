import {
  VERSES,
  dayKey,
  filterByThemes,
  hashString,
  pickRandomVerse,
  pickVerseOfDay,
} from '@noe-arcakids/shared';

jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    get: jest.fn(async () => null),
    save: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));

describe('verso del día (determinista)', () => {
  it('devuelve el mismo verso para el mismo día', () => {
    const date = new Date(2026, 8, 9, 10, 30, 0);
    const a = pickVerseOfDay(VERSES, undefined, date);
    const b = pickVerseOfDay(VERSES, undefined, date);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a?.id).toBe(b?.id);
  });

  it('puede cambiar entre días distintos', () => {
    const day1 = pickVerseOfDay(VERSES, undefined, new Date(2026, 8, 9));
    const day2 = pickVerseOfDay(VERSES, undefined, new Date(2026, 8, 10));
    expect(day1?.id).not.toBe(day2?.id);
  });

  it('respeta el filtro por tema', () => {
    const verse = pickVerseOfDay(VERSES, ['morning'], new Date(2026, 8, 9));
    expect(verse).not.toBeNull();
    expect(verse?.themes).toContain('morning');
  });

  it('usa el catálogo completo como fallback cuando no hay versos del tema', () => {
    const verse = pickVerseOfDay(VERSES, ['covenant'], new Date(2026, 8, 9));
    expect(verse).not.toBeNull();
  });
});

describe('hashString / dayKey', () => {
  it('produce una clave estable YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('es idempotente', () => {
    const s = '2026-09-09';
    expect(hashString(s)).toBe(hashString(s));
    expect(hashString(s)).toBeGreaterThanOrEqual(0);
  });
});

describe('filterByThemes', () => {
  it('filtra solo versos del tema pedido', () => {
    const morning = filterByThemes(VERSES, ['morning']);
    expect(morning.length).toBeGreaterThan(0);
    for (const verse of morning) {
      expect(verse.themes).toContain('morning');
    }
  });

  it('sin temas devuelve una copia de todo el catálogo', () => {
    const all = filterByThemes(VERSES);
    expect(all).toHaveLength(VERSES.length);
  });
});

describe('pickRandomVerse', () => {
  it('nunca repite el verso excluido si hay más de uno disponible', () => {
    const pool = filterByThemes(VERSES, ['family']);
    const first = pickRandomVerse(VERSES, ['family'], undefined);
    expect(first).not.toBeNull();
    const second = pickRandomVerse(VERSES, ['family'], first?.id);
    expect(second).not.toBeNull();
    expect(second?.id).not.toBe(first?.id);
    expect(pool.length).toBeGreaterThan(1);
  });
});