import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@noe-arcakids/shared';

interface PlaceholderScreenProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PlaceholderScreen({
  title,
  description,
  children,
}: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});