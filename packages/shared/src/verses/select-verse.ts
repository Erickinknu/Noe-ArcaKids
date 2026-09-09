import type { BibleVerse, VerseTheme } from './types';

export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function filterByThemes(
  verses: readonly BibleVerse[],
  themes?: readonly VerseTheme[],
): BibleVerse[] {
  if (!themes || themes.length === 0) {
    return verses.slice();
  }
  return verses.filter((verse) => verse.themes.some((theme) => themes.includes(theme)));
}

export function pickVerseOfDay(
  verses: readonly BibleVerse[],
  themes?: readonly VerseTheme[],
  date: Date = new Date(),
): BibleVerse | null {
  const themed = filterByThemes(verses, themes);
  const pool = themed.length > 0 ? themed : verses.slice();
  if (pool.length === 0) {
    return null;
  }
  return pool[hashString(dayKey(date)) % pool.length];
}

export function pickRandomVerse(
  verses: readonly BibleVerse[],
  themes?: readonly VerseTheme[],
  excludeId?: string,
): BibleVerse | null {
  let pool = filterByThemes(verses, themes);
  if (pool.length === 0) {
    pool = verses.slice();
  }
  if (excludeId && pool.length > 1) {
    pool = pool.filter((verse) => verse.id !== excludeId);
  }
  if (pool.length === 0) {
    return null;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}