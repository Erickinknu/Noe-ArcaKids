export const VERSE_THEMES = [
  'family',
  'wisdom',
  'rest',
  'courage',
  'morning',
  'love',
  'hope',
  'covenant',
  'purpose',
  'gratitude',
] as const;

export type VerseTheme = (typeof VERSE_THEMES)[number];

export interface VerseLocalizedText {
  text: string;
  reference: string;
}

export interface BibleVerse {
  id: string;
  themes: readonly VerseTheme[];
  es: VerseLocalizedText;
  en: VerseLocalizedText;
}