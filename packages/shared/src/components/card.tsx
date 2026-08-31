import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../theme-context';
import { radius, spacing, type ThemeColors } from '../theme';

interface CardProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Card({ style, children }: CardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
  });