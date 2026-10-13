import { useEffect, useState } from 'react';

import type { FamilyMode } from '@noe-arcakids/types';

import { familyService } from '../services/family-service';

type ContentMode = FamilyMode;

function normalizeMode(value: unknown): ContentMode {
  if (value === 'general' || value === 'cristiano' || value === 'educativo') {
    return value;
  }
  return 'general';
}

// Caché de sesión: una sola lectura de red por sesión.
let cachedMode: ContentMode | null = null;
let inflight: Promise<ContentMode> | null = null;

function loadContentMode(): Promise<ContentMode> {
  if (cachedMode !== null) return Promise.resolve(cachedMode);
  if (inflight !== null) return inflight;
  inflight = familyService.getMyFamily().then(({ family }) => {
    const mode = normalizeMode(
      (family as { mode?: unknown } | null | undefined)?.mode,
    );
    cachedMode = mode;
    return mode;
  });
  inflight.then(
    () => {
      inflight = null;
    },
    () => {
      inflight = null;
    },
  );
  return inflight;
}

export function useContentMode(): {
  mode: ContentMode;
  loaded: boolean;
} {
  const [mode, setMode] = useState<ContentMode>(cachedMode ?? 'general');
  const [loaded, setLoaded] = useState<boolean>(cachedMode !== null);

  useEffect(() => {
    let active = true;
    // Si ya hay caché, el estado inicial la refleja; no se toca estado aquí.
    if (cachedMode !== null) {
      return;
    }
    loadContentMode().then(
      (value) => {
        if (!active) return;
        setMode(value);
        setLoaded(true);
      },
      () => {
        if (!active) return;
        setLoaded(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return { mode, loaded };
}
