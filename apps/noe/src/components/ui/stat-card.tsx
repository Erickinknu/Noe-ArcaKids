import { View, Text, StyleSheet } from 'react-native';
import type { ReactNode } from 'react';
import { colors, spacing, radius, typography, shadows } from '@noe-arcakids/shared';

interface StatCardProps {
  icon: ReactNode | string;
  value: string;
  label: string;
  color?: string;
}

export function StatCard({ icon, value, label, color = colors.primary }: StatCardProps) {
  return (
    <View style={[styles.container, shadows.md]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        {typeof icon === 'string' ? (
          <Text style={[styles.icon, { color }]}>{icon}</Text>
        ) : (
          icon
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: typography.fontSizes.title,
  },
  value: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSizes.subtitle,
    color: colors.textMuted,
  },
});
