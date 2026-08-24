import {
  changeLanguage,
  use as extendWith,
  type i18n as I18n,
} from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import { storage } from '@noe-arcakids/storage';
import {
  DEFAULT_LANGUAGE,
  detectLanguage,
  resources,
  type SupportedLanguage,
} from '@noe-arcakids/shared';

const LANGUAGE_KEY = 'noe/language';

const i18n: I18n = extendWith(initReactI18next);

export function getSavedLanguage(): Promise<string | null> {
  return storage.get(LANGUAGE_KEY);
}

export async function initI18n(): Promise<void> {
  const saved = await getSavedLanguage();
  const systemLocale = I18nManager.getConstants().localeIdentifier;
  const lng: SupportedLanguage =
    (saved as SupportedLanguage) ?? detectLanguage(systemLocale) ?? DEFAULT_LANGUAGE;

  await i18n.init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    // When a key is missing, avoid returning the raw key string to the UI.
    // Instead return an empty string so components show safe fallbacks.
    parseMissingKeyHandler: () => '',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export async function setLanguage(lng: SupportedLanguage): Promise<void> {
  await changeLanguage(lng);
  await storage.save(LANGUAGE_KEY, lng);
}