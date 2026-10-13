import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Card, radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

import type { ControlApp } from './control-types';

interface AppCategoryCardProps {
  icon: string;
  accent: string;
  title: string;
  apps: ControlApp[];
  maxShown?: number;
  /** Cuando es false solo se muestra el botón de acción (tarjeta No permitidas). */
  showList?: boolean;
  actionLabel: string;
  actionVisible?: boolean;
  onAction: () => void;
}

export function AppCategoryCard({
  icon,
  accent,
  title,
  apps,
  maxShown = 5,
  showList = true,
  actionLabel,
  actionVisible = true,
  onAction,
}: AppCategoryCardProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);

  const shown = showList ? apps.slice(0, maxShown) : [];

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
          <MaterialIcons name={icon as any} size={22} color={accent} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {showList ? (
        shown.length > 0 ? (
          <View style={styles.list}>
            {shown.map((app) => (
              <View key={app.packageName} style={styles.appRow}>
                <MaterialIcons name="apps" size={18} color={colors.textMuted} />
                <Text style={styles.appLabel} numberOfLines={1}>
                  {app.appLabel}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>{tr('noe.control.noAppsYet')}</Text>
        )
      ) : null}

      {actionVisible ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={onAction}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    card: { gap: spacing.md, ...shadows.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    list: { gap: spacing.xs },
    appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    appLabel: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
    empty: { fontSize: typography.fontSizes.body, color: colors.textMuted },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    actionBtnPressed: { opacity: 0.7 },
    actionText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.primary,
    },
  });
