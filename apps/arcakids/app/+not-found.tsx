import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme, spacing, typography, radius, type ThemeColors } from '@noe-arcakids/shared';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <MaterialIcons name="sentiment-very-dissatisfied" size={64} color={colors.textMuted} />
      <Text style={styles.title}>{tr('common.pageNotFound')}</Text>
      <Text style={styles.message}>{tr('common.pageNotFoundDescription')}</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>{tr('common.goHome')}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    button: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonText: {
      color: colors.onPrimary,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
    },
  });