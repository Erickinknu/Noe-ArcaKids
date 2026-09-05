import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { storage } from '@noe-arcakids/storage';

import {
  getColors,
  getShadowsForScheme,
  radius,
  spacing,
  typography,
  type AppColorTheme,
  type ThemeContextValue,
  type ThemeDeps,
} from './theme';

const THEME_KEY = 'app/theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppColorTheme>('system');

  useEffect(() => {
    storage
      .get(THEME_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeState(saved);
          Appearance.setColorScheme(saved === 'system' ? 'unspecified' : saved);
        }
      })
      .catch(() => {});
  }, []);

  const resolved: 'light' | 'dark' =
    theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;

  const colors = getColors(resolved);
  const shadows = getShadowsForScheme(resolved);

  const deps = useMemo<ThemeDeps>(
    () => ({ colors, shadows, spacing, radius, typography }),
    [colors, shadows]
  );

  const setTheme = useCallback((t: AppColorTheme) => {
    setThemeState(t);
    Appearance.setColorScheme(t === 'system' ? 'unspecified' : t);
    storage.save(THEME_KEY, t).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, colors, shadows, deps, setTheme }),
    [theme, resolved, colors, shadows, deps, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
