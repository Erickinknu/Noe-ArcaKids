import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '@noe-arcakids/storage';
import {
  getColors,
  getShadows,
  type AppColorTheme,
} from '@noe-arcakids/shared';

const THEME_KEY = 'noe/app/theme';

interface ThemeContextValue {
  theme: AppColorTheme;
  resolved: 'light' | 'dark';
  colors: ReturnType<typeof getColors>;
  shadows: ReturnType<typeof getShadows>;
  setTheme: (t: AppColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppColorTheme>('system');

  useEffect(() => {
    const saved = storage.getString(THEME_KEY) as AppColorTheme | undefined;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setThemeState(saved);
    }
  }, []);

  const resolved = theme === 'system' ? (systemScheme ?? 'light') : theme;
  const colors = getColors(resolved);
  const shadows = getShadows(resolved);

  function setTheme(t: AppColorTheme) {
    setThemeState(t);
    storage.set(THEME_KEY, t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, colors, shadows, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback for screens outside provider
    return {
      theme: 'light' as AppColorTheme,
      resolved: 'light' as const,
      colors: getColors('light'),
      shadows: getShadows('light'),
      setTheme: () => {},
    };
  }
  return ctx;
}
