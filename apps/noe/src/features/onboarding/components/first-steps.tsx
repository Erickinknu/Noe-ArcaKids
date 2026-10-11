import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface FirstStepsProps {
  onDone: () => void;
}

const TOTAL = 3;

export function FirstSteps({ onDone }: FirstStepsProps) {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: 'child-care' as const,
      title: tr('noe.firstSteps.step1Title'),
      text: tr('noe.firstSteps.step1Text'),
      action: tr('noe.firstSteps.openChildren'),
      onPress: () => router.push('/(app)/children'),
    },
    {
      icon: 'phone-android' as const,
      title: tr('noe.firstSteps.step2Title'),
      text: tr('noe.firstSteps.step2Text'),
      action: null,
      onPress: null,
    },
    {
      icon: 'qr-code-2' as const,
      title: tr('noe.firstSteps.step3Title'),
      text: tr('noe.firstSteps.step3Text'),
      action: tr('noe.firstSteps.openLinking'),
      onPress: () => router.push('/(app)/linking'),
    },
  ];

  const current = steps[step];
  const isLast = step === TOTAL - 1;

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>{tr('noe.firstSteps.title')}</Text>
        <Text style={styles.subtitle}>{tr('noe.firstSteps.subtitle')}</Text>
      </View>

      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepOf}>
        {tr('noe.firstSteps.stepOf', { current: step + 1, total: TOTAL })}
      </Text>

      <View style={styles.card}>
        <MaterialIcons name={current.icon} size={48} color={colors.primary} />
        <Text style={styles.cardTitle}>{current.title}</Text>
        <Text style={styles.cardText}>{current.text}</Text>
        {current.action ? (
          <Pressable style={styles.cardButton} onPress={current.onPress ?? undefined}>
            <Text style={styles.cardButtonText}>{current.action}</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.transparency}>{tr('noe.firstSteps.transparency')}</Text>

      <View style={styles.footer}>
        <Pressable style={styles.skip} onPress={onDone}>
          <Text style={styles.skipText}>{tr('noe.firstSteps.skip')}</Text>
        </Pressable>
        {isLast ? (
          <Pressable style={styles.primary} onPress={onDone}>
            <Text style={styles.primaryText}>{tr('noe.firstSteps.finish')}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primary} onPress={() => setStep((s) => s + 1)}>
            <Text style={styles.primaryText}>{tr('noe.firstSteps.next')}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
      gap: spacing.md,
    },
    header: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 22,
    },
    stepOf: {
      textAlign: 'center',
      color: colors.textMuted,
      fontSize: typography.fontSizes.caption,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    cardText: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    cardButton: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    cardButtonText: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
    transparency: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    footer: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    primaryText: {
      color: colors.onPrimary,
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.medium,
    },
    skip: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    skipText: {
      color: colors.textMuted,
      fontSize: typography.fontSizes.body,
    },
  });
