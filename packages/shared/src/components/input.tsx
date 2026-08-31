import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { useTheme } from '../theme-context';
import { spacing, typography, type ThemeColors } from '../theme';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        placeholderTextColor={String(colors.inputPlaceholder)}
        style={[
          styles.input,
          error ? styles.inputError : null,
          style,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    label: {
      color: colors.textMuted,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
    },
    input: {
      minHeight: colors.inputMinHeight as number,
      borderWidth: 1,
      borderColor: String(colors.inputBorder),
      borderRadius: colors.inputRadius as number,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: typography.fontSizes.body,
    },
    inputError: {
      borderColor: colors.danger,
    },
    error: {
      color: colors.danger,
      fontSize: typography.fontSizes.caption,
    },
  });