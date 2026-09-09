import { storage } from '@noe-arcakids/storage';

export const VERSES_STORAGE_KEYS = {
  showVerses: 'show_verses',
  lastVerseId: 'last_verse_id',
} as const;

export async function loadShowVerses(
  key: string = VERSES_STORAGE_KEYS.showVerses,
): Promise<boolean> {
  const raw = await storage.get(key);
  return raw === null ? true : raw !== 'false';
}

export async function saveShowVerses(
  value: boolean,
  key: string = VERSES_STORAGE_KEYS.showVerses,
): Promise<void> {
  await storage.save(key, String(value));
}

export async function loadLastVerseId(
  key: string = VERSES_STORAGE_KEYS.lastVerseId,
): Promise<string | null> {
  return storage.get(key);
}

export async function saveLastVerseId(
  id: string,
  key: string = VERSES_STORAGE_KEYS.lastVerseId,
): Promise<void> {
  await storage.save(key, id);
}