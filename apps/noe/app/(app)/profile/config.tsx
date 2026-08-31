import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme } from '@noe-arcakids/shared';
import { APP_VERSION } from '@noe-arcakids/config';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';
import type { AppColorTheme } from '@noe-arcakids/shared';

const THEME_OPTIONS: { key: AppColorTheme; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'light', label: 'Claro', icon: 'light-mode' },
  { key: 'dark', label: 'Oscuro', icon: 'dark-mode' },
  { key: 'system', label: 'Automático (sistema)', icon: 'phone-iphone' },
];

export default function ConfigScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { theme, setTheme } = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Configuración de la app</Text>
      </Pressable>

      {/* ── Theme ── */}
      <Text style={styles.sectionLabel}>Apariencia</Text>
      <Card>
        {THEME_OPTIONS.map((opt, i) => (
          <Pressable
            key={opt.key}
            style={[
              styles.optionRow,
              i < THEME_OPTIONS.length - 1 && styles.optionBorder,
            ]}
            onPress={() => setTheme(opt.key)}
          >
            <MaterialIcons
              name={opt.icon}
              size={22}
              color={theme === opt.key ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.optionText,
                theme === opt.key && { color: colors.primary, fontWeight: typography.fontWeights.bold },
              ]}
            >
              {opt.label}
            </Text>
            {theme === opt.key && (
              <MaterialIcons name="check" size={20} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </Card>

      {/* ── Language ── */}
      <Text style={styles.sectionLabel}>Idioma</Text>
      <Card>
        <View style={styles.optionRow}>
          <MaterialIcons name="language" size={22} color={colors.primary} />
          <Text style={styles.optionText}>Español</Text>
          <MaterialIcons name="check" size={20} color={colors.primary} />
        </View>
      </Card>

      {/* ── Security ── */}
      <Text style={styles.sectionLabel}>Seguridad</Text>
      <Card>
        <View style={styles.optionRow}>
          <MaterialIcons name="fingerprint" size={22} color={colors.primary} />
          <Text style={styles.optionText}>Desbloqueo biométrico</Text>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.optionRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <MaterialIcons name="lock" size={22} color={colors.primary} />
          <Text style={styles.optionText}>Bloqueo con PIN al abrir NOE</Text>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </Card>

      {/* ── About ── */}
      <Text style={styles.sectionLabel}>Acerca de</Text>
      <Card>
        <View style={styles.optionRow}>
          <MaterialIcons name="info" size={22} color={colors.textMuted} />
          <Text style={styles.optionText}>Versión</Text>
          <Text style={styles.optionValue}>{APP_VERSION}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  sectionLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  optionBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  optionValue: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
});
