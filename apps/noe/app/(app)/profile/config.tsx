import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { pinService } from '@/features/pin/services/pin-service';
import { APP_VERSION } from '@noe-arcakids/config';
import { Card, spacing, typography, useTheme, type AppColorTheme, type ThemeColors } from '@noe-arcakids/shared';

const THEME_OPTIONS: { key: AppColorTheme; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: 'light', label: 'Claro', icon: 'light-mode' },
  { key: 'dark', label: 'Oscuro', icon: 'dark-mode' },
  { key: 'system', label: 'Automático (sistema)', icon: 'phone-iphone' },
];

export default function ConfigScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, theme, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [lockOnOpen, setLockOnOpen] = useState(false);

  useEffect(() => {
    pinService.isLockOnOpenEnabled().then(setLockOnOpen).catch(() => {});
  }, []);

  async function handleLockOnOpenChange(value: boolean) {
    if (value) {
      const hasPin = await pinService.isEnabled();
      if (!hasPin) {
        Alert.alert(
          'Primero configura un PIN',
          'No tienes un PIN configurado. Crea tu PIN en el menú “Código PIN” y luego podrás activar el bloqueo al abrir NOE.',
          [{ text: 'Configurar PIN', onPress: () => router.push('/(app)/profile/pin') }, { text: 'Cancelar', style: 'cancel' }]
        );
        return;
      }
    }
    setLockOnOpen(value);
    await pinService.setLockOnOpenEnabled(value);
  }

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
        <Pressable style={styles.optionRow} onPress={() => router.push('/settings')}>
          <MaterialIcons name="language" size={22} color={colors.primary} />
          <Text style={styles.optionText}>Español</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>

      {/* ── Security ── */}
      <Text style={styles.sectionLabel}>Seguridad</Text>
      <Card>
        <View style={[styles.optionRow, styles.optionMuted]}>
          <MaterialIcons name="fingerprint" size={22} color={colors.textMuted} />
          <View style={styles.optionBody}>
            <Text style={styles.optionText}>Desbloqueo biométrico</Text>
            <Text style={styles.optionSubtext}>Disponible próximamente</Text>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <View style={[styles.optionRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
          <MaterialIcons name="lock" size={22} color={colors.primary} />
          <View style={styles.optionBody}>
            <Text style={styles.optionText}>Bloqueo con PIN al abrir NOE</Text>
            <Text style={styles.optionSubtext}>
              Pide tu PIN cada vez que abras la app
            </Text>
          </View>
          <Switch
            value={lockOnOpen}
            onValueChange={handleLockOnOpenChange}
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  optionBody: {
    flex: 1,
    gap: 2,
  },
  optionMuted: {
    opacity: 0.6,
  },
  optionText: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  optionSubtext: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  optionValue: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
});