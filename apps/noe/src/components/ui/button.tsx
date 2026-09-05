import { useMemo, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

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
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

interface VariantStyles {
  container: ViewStyle;
  text: TextStyle;
}

function variantStylesFor(colors: ThemeColors): Record<ButtonVariant, VariantStyles> {
  return {
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
}

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
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(), []);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const v = variantStylesFor(colors)[variant];
  const s = sizeStyles[size];
  const content = children ?? label;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  /* eslint-disable react-hooks/immutability */
  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 120 });
    opacity.value = withTiming(0.85, { duration: 120 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 180 });
    opacity.value = withTiming(1, { duration: 180 });
  };
  /* eslint-enable react-hooks/immutability */

  return (
    <Animated.View style={animatedStyle}>
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof content === 'string' ? content : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        styles.base,
        v.container,
        s.container,
        (disabled || loading) && styles.disabled,
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
    </Animated.View>
  );
}

const makeStyles = () =>
  StyleSheet.create({
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
  });