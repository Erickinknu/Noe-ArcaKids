import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BibleVerse, VerseTheme } from './types';
import { VERSES } from './verse-catalog';
import { pickRandomVerse, pickVerseOfDay } from './select-verse';
import {
  loadLastVerseId,
  loadShowVerses,
  saveLastVerseId,
  saveShowVerses,
  VERSES_STORAGE_KEYS,
} from './verse-storage';

function themesKey(themes?: readonly VerseTheme[]): string {
  return themes ? themes.join(',') : '';
}

export function useShowVerses(
  key: string = VERSES_STORAGE_KEYS.showVerses,
): [boolean | null, (value: boolean) => void] {
  const [enabled, setEnabledState] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    loadShowVerses(key)
      .then((value) => {
        if (active) {
          setEnabledState(value);
        }
      })
      .catch(() => {
        if (active) {
          setEnabledState(true);
        }
      });
    return () => {
      active = false;
    };
  }, [key]);

  const setEnabled = useCallback(
    (value: boolean) => {
      setEnabledState(value);
      void saveShowVerses(value, key);
    },
    [key],
  );

  return [enabled, setEnabled];
}

export function useVerseOfDay(
  themes?: readonly VerseTheme[],
  key: string = VERSES_STORAGE_KEYS.showVerses,
): BibleVerse | null {
  const [enabled] = useShowVerses(key);
  const themesValue = themesKey(themes);

  return useMemo(
    () => (enabled === true ? pickVerseOfDay(VERSES, themes) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, themesValue],
  );
}

export function useRandomVerse(
  themes?: readonly VerseTheme[],
  key: string = VERSES_STORAGE_KEYS.showVerses,
): BibleVerse | null {
  const [enabled] = useShowVerses(key);
  const [verse, setVerse] = useState<BibleVerse | null>(null);
  const themesValue = themesKey(themes);

  useEffect(() => {
    if (enabled !== true) {
      setVerse(null);
      return;
    }
    let active = true;
    void (async () => {
      const excludeId = await loadLastVerseId();
      const next = pickRandomVerse(VERSES, themes, excludeId ?? undefined);
      if (next) {
        await saveLastVerseId(next.id);
      }
      if (active) {
        setVerse(next);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, themesValue]);

  return verse;
}