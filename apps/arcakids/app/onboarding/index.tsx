import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants';
import { identityService } from '@/features/identity/services/identity-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { errorMessage } from '@/hooks/use-async-data';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄'];

export default function OnboardingScreen() {
  const { t: tr } = useTranslation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    setError(null);
    try {
      await identityService.saveChildProfile({ name, avatar });
      await onboardingService.markCompleted();
      router.replace(ROUTES.app);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (step === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.mascot}>🧸</Text>
        <Text style={styles.title}>{tr('arcakids.onboarding.welcome')}</Text>
        <Text style={styles.description}>
          {tr('arcakids.onboarding.welcomeText')}
        </Text>
        <Button onPress={() => setStep(1)}>{tr('arcakids.onboarding.start')}</Button>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.stepLabel}>
        {tr('arcakids.onboarding.stepOf', { current: step, total: 2 })}
      </Text>
      <Text style={styles.title}>
        {step === 1 ? tr('arcakids.onboarding.nameQuestion') : tr('arcakids.onboarding.pickBuddy')}
      </Text>
      {step === 1 ? (
        <>
          <Input
            label={tr('arcakids.onboarding.nameLabel')}
            value={name}
            onChangeText={setName}
            autoComplete="name"
            placeholder={tr('arcakids.onboarding.namePlaceholder')}
          />
          <Button onPress={() => setStep(2)} disabled={name.trim().length === 0}>
            {tr('arcakids.onboarding.next')}
          </Button>
        </>
      ) : (
        <>
          <Text style={styles.avatarPreview}>{avatar}</Text>
          <View style={styles.avatarRow}>
            {AVATARS.map((item) => (
              <Pressable
                key={item}
                onPress={() => setAvatar(item)}
                style={[styles.avatarOption, item === avatar && styles.avatarSelected]}
              >
                <Text style={styles.avatarEmoji}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Button onPress={handleFinish} loading={saving}>
            {tr('arcakids.onboarding.finish')}
          </Button>
          <Pressable onPress={() => setStep(1)}>
            <Text style={styles.back}>{tr('arcakids.onboarding.back')}</Text>
          </Pressable>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  stepLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  avatarPreview: {
    fontSize: 56,
    textAlign: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  avatarOption: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  avatarEmoji: {
    fontSize: 28,
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