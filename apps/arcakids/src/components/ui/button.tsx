import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

type Variant = 'primary' | 'outline' | 'ghost';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  loading = false,
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.onPrimary : colors.primary}
        />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && styles.labelOutline]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  base: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
  },
  labelOutline: {
    color: colors.primary,
  },
});