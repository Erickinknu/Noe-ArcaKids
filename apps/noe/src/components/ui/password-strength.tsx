import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@noe-arcakids/shared';

interface Props {
  password: string;
}

function getStrength(password: string): { level: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: colors.danger };
  if (score <= 2) return { level: 2, label: 'Fair', color: colors.warning };
  if (score <= 3) return { level: 3, label: 'Good', color: colors.primary };
  return { level: 4, label: 'Strong', color: colors.success };
}

export function PasswordStrength({ password }: Props) {
  if (!password) return null;

  const { level, label, color } = getStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.barContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.bar,
              { backgroundColor: i <= level ? color : colors.border },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  barContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    minWidth: 50,
  },
});
