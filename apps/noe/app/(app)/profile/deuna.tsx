import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { PLAN_CATALOG, type PlanId } from '@/features/billing/plans';
import { deunaService } from '@/features/billing/services/deuna-service';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, errorMessage, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

/**
 * Pago con DEUNA (Ecuador) — estructura lista.
 * Muestra el QR del negocio (placeholder hasta recibir el QR real),
 * el monto del plan y registra la orden como pendiente de verificación.
 */
export default function DeunaScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ plan?: string }>();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);

  const plan = PLAN_CATALOG.find((p) => p.id === (params.plan as PlanId)) ?? PLAN_CATALOG[1];
  const [reporting, setReporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReported() {
    setReporting(true);
    setError(null);
    try {
      await deunaService.reportPayment(plan.id, plan.priceCents);
      setDone(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setReporting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>{tr('noe.deuna.title')}</Text>
      </Pressable>

      <Card style={styles.card}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>
          {plan.price} <Text style={styles.planPeriod}>{plan.period} USD</Text>
        </Text>
        <Text style={styles.hint}>{tr('noe.deuna.amountHint')}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{tr('noe.deuna.qrTitle')}</Text>
        {/* QR real: reemplazar este placeholder por <Image source={require('@/assets/images/deuna-qr.png')} /> */}
        <View style={styles.qrPlaceholder}>
          <MaterialIcons name="qr-code-2" size={72} color={colors.primary} />
          <Text style={styles.qrText}>{tr('noe.deuna.qrPlaceholder')}</Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>{tr('noe.deuna.stepsTitle')}</Text>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{n}</Text>
            </View>
            <Text style={styles.stepText}>{tr(`noe.deuna.step${n}`)}</Text>
          </View>
        ))}
      </Card>

      {done ? (
        <Card style={[styles.card, styles.doneCard]}>
          <MaterialIcons name="check-circle" size={40} color={colors.success} />
          <Text style={styles.doneTitle}>{tr('noe.deuna.reportedTitle')}</Text>
          <Text style={styles.doneText}>{tr('noe.deuna.reportedText')}</Text>
          <Button variant="secondary" onPress={() => router.replace('/(app)/profile/suscripcion')}>
            {tr('noe.deuna.backToPlans')}
          </Button>
        </Card>
      ) : (
        <Button onPress={handleReported} loading={reporting}>
          {tr('noe.deuna.reportButton')}
        </Button>
      )}
      {reporting ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    screen: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    card: {
      ...shadows.sm,
      gap: spacing.sm,
    },
    planName: {
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    planPrice: {
      fontSize: 32,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
    },
    planPeriod: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      fontWeight: typography.fontWeights.regular,
    },
    hint: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    sectionTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    qrPlaceholder: {
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    qrText: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'center',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeights.bold,
    },
    stepText: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      color: colors.text,
      lineHeight: 22,
    },
    doneCard: {
      alignItems: 'center',
      borderColor: colors.success,
      borderWidth: 1.5,
    },
    doneTitle: {
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.bold,
      color: colors.success,
      textAlign: 'center',
    },
    doneText: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    error: {
      fontSize: typography.fontSizes.body,
      color: colors.danger,
      textAlign: 'center',
    },
  });
