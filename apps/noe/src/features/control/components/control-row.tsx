import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface ControlRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  detail?: string;
  onPress?: () => void;
}

/** Fila táctil compacta estilo KpiTile: una línea, icono, título, detalle y chevron. */
export function ControlRow({ icon, iconColor, title, detail, onPress }: ControlRowProps) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconWrap, { backgroundColor: (iconColor ?? colors.primary) + '18' }]}>
        <MaterialIcons name={icon as any} size={18} color={iconColor ?? colors.primary} />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {detail ? (
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
      {onPress ? <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors, _shadows: ThemeShadows) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    rowPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    detail: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      maxWidth: 140,
    },
  });
