import i18next from 'i18next';

import type { Resource } from 'i18next';

import { en } from './en';
import { es } from './es';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  es: 'Espa\u00f1ol',
  en: 'English',
};

export const resources: Resource = {
  es: { translation: es },
  en: { translation: en },
};

export function detectLanguage(locale?: string | null): SupportedLanguage {
  if (!locale) {
    return DEFAULT_LANGUAGE;
  }
  const code = locale.toLowerCase();
  if (code.startsWith('en')) {
    return 'en';
  }
  if (code.startsWith('es')) {
    return 'es';
  }
  return DEFAULT_LANGUAGE;
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options);
}