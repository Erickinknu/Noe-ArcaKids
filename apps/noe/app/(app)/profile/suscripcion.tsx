import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { billingService } from '@/features/billing/services/billing-service';
import { PLAN_CATALOG, type PlanId } from '@/features/billing/plans';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

export default function SuscripcionScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [claiming, setClaiming] = useState<PlanId | null>(null);

  const fetchSubscription = useCallback(() => billingService.getSubscription(), []);
  const { data: subscription, loading, reload } = useAsyncData(fetchSubscription);

  const currentPlan: PlanId = subscription?.plan ?? 'free';

  function planLimits(plan: PlanId): string {
    const entry = PLAN_CATALOG.find((p) => p.id === plan);
    if (!entry) return '';
    const kids = entry.maxChildren == null ? '∞' : String(entry.maxChildren);
    const apps = entry.maxBlockedApps == null ? '∞' : String(entry.maxBlockedApps);
    return tr('noe.plans.limitsLine', { kids, apps });
  }

  async function handleChoose(plan: PlanId) {
    // Los planes de pago van a DEUNA; el gratuito se activa directo.
    if (plan !== 'free') {
      router.push({ pathname: '/(app)/profile/deuna', params: { plan } });
      return;
    }
    setClaiming(plan);
    try {
      const updated = await billingService.claimPlan(plan);
      await reload();
      Alert.alert(
        tr('noe.plans.upgraded', { plan: updated.plan }),
        tr('noe.plans.billingNote') + '\n\n' + tr('noe.plans.providerNote')
      );
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setClaiming(null);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>{tr('noe.plans.title')}</Text>
      </Pressable>

      <Text style={styles.subtitle}>{tr('noe.plans.subtitle')}</Text>

      <Card style={styles.deunaBanner}>
        <MaterialIcons name="qr-code-2" size={28} color={colors.secondary} />
        <View style={styles.deunaBannerInfo}>
          <Text style={styles.deunaBannerTitle}>{tr('noe.plans.deunaBannerTitle')}</Text>
          <Text style={styles.deunaBannerText}>{tr('noe.plans.deunaBannerText')}</Text>
        </View>
      </Card>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{tr('noe.plans.loading')}</Text>
        </View>
      ) : (
        PLAN_CATALOG.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <Card key={plan.id} style={[styles.planCard, isCurrent && styles.planCurrent]}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.planPrice}>{plan.price}</Text>
                  <Text style={styles.planPeriod}>{plan.period}</Text>
                </View>
              </View>
              <Text style={styles.limitsLine}>{planLimits(plan.id)}</Text>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <MaterialIcons name="check" size={18} color={colors.success} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>{tr('noe.plans.currentBadge')}</Text>
                </View>
              ) : (
                <Button
                  variant={plan.id === 'family' ? 'primary' : 'secondary'}
                  size="sm"
                  style={{ marginTop: spacing.sm }}
                  loading={claiming === plan.id}
                  onPress={() => handleChoose(plan.id)}
                >
                  {plan.id === 'free' ? tr('noe.plans.choose') : tr('noe.plans.payWithDeuna')}
                </Button>
              )}
            </Card>
          );
        })
      )}
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
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  deunaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: colors.secondary,
    borderWidth: 1.5,
    ...shadows.sm,
  },
  deunaBannerInfo: {
    flex: 1,
  },
  deunaBannerTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  deunaBannerText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  limitsLine: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
  planCard: {
    gap: spacing.sm,
    ...shadows.sm,
  },
  planCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  planPeriod: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  currentBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.primary,
  },
});