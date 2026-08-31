import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@noe-arcakids/shared';

export function ThemeToggle(_props: { size?: number }) {
  const { t: tr } = useTranslation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Pressable style={styles.container} onPress={toggleTheme}>
      <Text style={styles.icon}>{isDark ? '☀️' : '🌙'}</Text>
      <Text style={styles.label}>{isDark ? tr('light_mode') : tr('dark_mode')}</Text>
    </Pressable>
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
    marginRight: 4,
  },
  label: {
    fontSize: 10,
  },
});
