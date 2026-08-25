import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getColors, colorThemes, AppColorTheme } from '@noe-arcakids/shared';

interface ThemeToggleProps {
  size?: number;
}

export function ThemeToggle({ size = 28 }: ThemeToggleProps) {
  const { t: tr } = useTranslation();
  const [theme, setTheme] = useState<AppColorTheme>(() => {
    // Check saved preference or system
    const saved = localStorage.getItem('arcakids_theme');
    if (saved) return saved as AppColorTheme;
    return 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('arcakids_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const themeColor = getColors(theme);

  return (
    <TouchableOpacity style={styles.container} onPress={toggleTheme}>
      <Text style={styles.icon} onPress={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </Text>
      <Text style={styles.label} onPress={toggleTheme}>
        {theme === 'dark' ? tr('light_mode') : tr('dark_mode')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  icon: {
    fontSize: 20,
    color: '#6B7280',
    marginRight: 4,
  },
  label: {
    fontSize: 10,
    color: '#6B7280',
  },
});