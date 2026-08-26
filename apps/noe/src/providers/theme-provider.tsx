import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, getShadows, type AppColorTheme } from '@noe-arcakids/shared';

const THEME_KEY = '@noe-arcakids/noe/app/theme';

interface ThemeContextValue {
  theme: AppColorTheme;
  resolved: 'light' | 'dark';
  colors: ReturnType<typeof getColors>;
  shadows: ReturnType<typeof getShadows>;
  setTheme: (t: AppColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'light',
  colors: getColors('light'),
  shadows: getShadows('light'),
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<AppColorTheme>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setThemeState(saved);
      }
    }).catch(() => {});
  }, []);

  const resolved = theme === 'system' ? (systemScheme ?? 'light') : theme;
  const colors = getColors(resolved);
  const shadows = getShadows(resolved);

  const setTheme = useCallback((t: AppColorTheme) => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t).catch(() => {});
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, colors, shadows, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
