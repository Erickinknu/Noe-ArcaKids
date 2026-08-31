import { useMemo } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { useParentalStatus } from '@/hooks/use-parental-status';
import { identityService } from '@/features/identity/services/identity-service';
import { ROUTES } from '@/constants';
import { useAsyncData, useNetworkStatus, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function HomeScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isOnline } = useNetworkStatus();
  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());
  const isLinked = Boolean(childInfo?.childId && childInfo?.familyId);
  const { reason } = useParentalStatus(isLinked);

  const name = childInfo?.name?.split(' ')[0] ?? 'kid';
  const avatar = childInfo?.avatar ?? '🧸';

  if (reason) {
    const isBedtime = reason === 'bedtime';
    return (
      <View style={[styles.screen, styles.blockedScreen]}>
        <Text style={styles.blockedEmoji}>{isBedtime ? '🌙' : '⏰'}</Text>
        <Text style={styles.blockedTitle}>
          {tr(
            isBedtime
              ? 'arcakids.parental.blockedBedtimeTitle'
              : 'arcakids.parental.blockedDailyTitle'
          )}
        </Text>
        <Text style={styles.blockedText}>
          {tr(
            isBedtime
              ? 'arcakids.parental.blockedBedtimeText'
              : 'arcakids.parental.blockedDailyText'
          )}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.avatar}>{avatar}</Text>
      <Text style={styles.title}>{tr('arcakids.home.hi', { name })}</Text>
      <Text style={styles.subtitle}>{tr('arcakids.home.whatDo')}</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>{tr('arcakids.home.connection')}</Text>
        <Text style={[styles.statusValue, isOnline ? styles.online : styles.offline]}>
          {isOnline ? tr('arcakids.home.online') : tr('arcakids.home.offline')}
        </Text>
      </View>
      {!isLinked ? (
        <Link href={ROUTES.link} asChild>
          <Card style={styles.linkBanner}>
            <Text style={styles.linkBannerEmoji}>🔗</Text>
            <View>
              <Text style={styles.linkBannerTitle}>
                {tr('arcakids.home.linkBannerTitle')}
              </Text>
              <Text style={styles.linkBannerText}>
                {tr('arcakids.home.linkBannerText')}
              </Text>
            </View>
          </Card>
        </Link>
      ) : null}
      <View style={styles.cards}>
        {isLinked ? (
          <Link href={ROUTES.launcher} asChild>
            <Card style={styles.card}>
              <Text style={styles.cardEmoji}>🎮</Text>
              <View>
                <Text style={styles.cardTitle}>
                  {tr('arcakids.launcher.title')}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {tr('arcakids.launcher.subtitle')}
                </Text>
              </View>
            </Card>
          </Link>
        ) : null}
        <Link href={ROUTES.activity} asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>⭐</Text>
            <Text style={styles.cardTitle}>{tr('arcakids.home.activity')}</Text>
            <Text style={styles.cardSubtitle}>
              {tr('arcakids.home.activitySubtitle')}
            </Text>
          </Card>
        </Link>
        <Link href={ROUTES.profile} asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>🧒</Text>
            <Text style={styles.cardTitle}>{tr('arcakids.home.profile')}</Text>
            <Text style={styles.cardSubtitle}>
              {tr('arcakids.home.profileSubtitle')}
            </Text>
          </Card>
        </Link>
        <Link href={ROUTES.settings} asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={styles.cardTitle}>{tr('arcakids.home.settings')}</Text>
            <Text style={styles.cardSubtitle}>
              {tr('arcakids.home.settingsSubtitle')}
            </Text>
          </Card>
        </Link>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  avatar: {
    fontSize: 56,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
  },
  statusValue: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
  },
  online: {
    color: colors.success,
  },
  offline: {
    color: colors.danger,
  },
  cards: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  linkBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: colors.primary,
  },
  linkBannerEmoji: {
    fontSize: 32,
  },
  linkBannerTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
  },
  linkBannerText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  blockedScreen: {
    justifyContent: 'center',
    paddingTop: spacing.lg,
  },
  blockedEmoji: {
    fontSize: 72,
    textAlign: 'center',
  },
  blockedTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
});