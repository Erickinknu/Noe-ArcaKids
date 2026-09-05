import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { linkingService } from '@/features/linking/services/linking-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { Input, errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const CODE_LENGTH = 8;

export default function OnboardingScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  async function handleLink() {
    if (code.trim().length === 0) return;
    setLinking(true);
    setError(null);
    try {
      await linkingService.redeem(code.trim());
      await onboardingService.markCompleted();
      router.replace(ROUTES.app);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLinking(false);
    }
  }

  if (step === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.mascot}>🧸</Text>
        <Text style={styles.title}>{tr('arcakids.onboarding.welcome')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.welcomeText')}</Text>
        <Button onPress={() => setStep(1)}>{tr('arcakids.onboarding.start')}</Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('arcakids.onboarding.codeTitle')}</Text>
      <Text style={styles.description}>{tr('arcakids.onboarding.codeText')}</Text>
      <Input
        label={tr('arcakids.onboarding.codeTypeLabel')}
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH));
          setError(null);
        }}
        placeholder={tr('arcakids.onboarding.codeTypePlaceholder')}
      />
      <Button onPress={handleLink} loading={linking} disabled={code.trim().length === 0}>
        {tr('arcakids.onboarding.linkButton')}
      </Button>
      <Pressable onPress={() => setStep(0)}>
        <Text style={styles.back}>{tr('arcakids.onboarding.back')}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  mascot: {
    fontSize: 64,
    textAlign: 'center',
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
  back: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
});