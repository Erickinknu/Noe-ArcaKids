import { useMemo } from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/stores/auth-store';
import { LoadingState } from '@/components/ui/loading-state';
import { Button } from '@/components/ui/button';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function JoinEntryScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const status = useAuthStore((state) => state.status);
  const { code } = useLocalSearchParams<{ code?: string }>();

  if (status === 'authenticated') {
    return <Redirect href={{ pathname: '/(app)/profile/unirme', params: { code: code ?? '' } }} />;
  }

  if (status === 'unauthenticated') {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface }]}>
        <Text style={styles.emoji}>👋</Text>
        <Text style={styles.title}>{tr('noe.familyInvites.notLoggedInTitle')}</Text>
        <Text style={styles.description}>{tr('noe.familyInvites.notLoggedInText')}</Text>
        <Button onPress={() => router.replace('/(auth)/login')}>
          {tr('noe.familyInvites.goToLogin')}
        </Button>
        <Pressable style={({ pressed }) => [styles.backLink, pressed && styles.pressed]} onPress={() => router.replace('/')}>
          <Text style={styles.backLinkText}>{tr('noe.familyInvites.backToApp')}</Text>
        </Pressable>
      </View>
    );
  }

  return <LoadingState text="" />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    emoji: {
      fontSize: 48,
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
      lineHeight: 22,
    },
    backLink: {
      padding: spacing.sm,
    },
    pressed: {
      opacity: 0.6,
    },
    backLinkText: {
      fontSize: typography.fontSizes.body,
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
  });