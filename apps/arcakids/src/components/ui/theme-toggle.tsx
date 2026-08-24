import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getColors, colorThemes, AppColorTheme } from '@/theme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ size = 'md': size }: ThemeToggleProps) {
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

  const themeIcon = theme === 'dark' ? 'sun' : 'moon';
  const iconName = theme === 'dark' ? 'Light Mode' : 'Dark Mode';

  const sizes = {
    sm: 24,
    md: 28,
    lg: 32,
  };

  return (
    <View style={styles.container} onPress={toggleTheme}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{size === 'lg' ? '☀️' : theme === 'dark' ? '☀️' : '🌙'}</Text>
      </View>
      <Text style={styles.label}>{t(theme === 'dark' ? 'light_mode' : 'dark_mode')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    color: '#1F2937',
  },
  icon: {
    fontSize: 20,
    color: '#6B7280',
  },
});