import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label?: string;
  children?: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.onPrimary },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: colors.onPrimary },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    text: { fontSize: typography.fontSizes.caption },
  },
  md: {
    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    text: { fontSize: typography.fontSizes.body },
  },
  lg: {
    container: { paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl },
    text: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
  },
};

export function Button({
  label,
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const [pressed, setPressed] = useState(false);
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const content = children ?? label;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.base,
        v.container,
        s.container,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text.color} />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          {typeof content === 'string' ? (
            <Text style={[styles.text, v.text, s.text, icon ? { marginLeft: spacing.sm } : undefined, textStyle]}>
              {content}
            </Text>
          ) : (
            content
          )}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: typography.fontWeights.medium,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.7,
  },
});
