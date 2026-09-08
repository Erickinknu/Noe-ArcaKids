import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DeviceRules } from '@noe-arcakids/types';

import { useParentalStatus } from '@/hooks/use-parental-status';
import { useAchievements } from '@/features/achievements/use-achievements';
import { identityService } from '@/features/identity/services/identity-service';
import { ROUTES } from '@/constants';
import { Card, useAsyncData, useNetworkStatus, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function nowMinutes(date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Seconds until the next bedtime window starts (0 if already inside it). null if disabled. */
function minutesUntilBedtime(rules: DeviceRules | null): number | null {
  if (!rules?.bedtimeEnabled || !rules.bedtimeStart || !rules.bedtimeEnd) {
    return null;
  }
  const start = toMinutes(rules.bedtimeStart);
  const end = toMinutes(rules.bedtimeEnd);
  if (start === end) return null;
  const now = nowMinutes();
  const overnight = start > end;
  if (overnight) {
    // Window covers [start..23:59] and [00:00..end-1].
    if (now < end) return 0; // inside the pre-midnight portion
    if (now < start) return start - now; // later today
    return 24 * 60 - now + start; // tomorrow
  }
  if (now < start) return start - now;
  if (now >= end) return start + 24 * 60 - now; // tomorrow
  return 0;
}

interface AppUsageItem {
  packageName: string;
  minutes: number;
}

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  styles: ReturnType<typeof makeStyles>;
}

function NavItem({ href, icon, label, styles }: NavItemProps) {
  return (
    <Link href={href} asChild>
      <Pressable style={styles.navItem} accessibilityRole="button" accessibilityLabel={label}>
        <Text style={styles.navIcon}>{icon}</Text>
        <Text style={styles.navLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

export default function HomeScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isOnline } = useNetworkStatus();
  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());
  const isLinked = Boolean(childInfo?.childId && childInfo?.familyId);
  const { rules, snapshot, reason } = useParentalStatus(isLinked);
  const { totalAchieved, totalAvailable, loading: achievementsLoading } = useAchievements();

  const name = childInfo?.name?.split(' ')[0] ?? 'kid';
  const avatar = childInfo?.avatar ?? '🧸';

  const totalMinutes = snapshot?.totalMinutes ?? 0;
  const limit = rules?.dailyLimitMinutes;
  const remaining = limit != null && limit > 0 ? Math.max(limit - totalMinutes, 0) : null;
  const limitPercent =
    limit != null && limit > 0 ? Math.min((totalMinutes / limit) * 100, 100) : null;

  const sortedApps = useMemo<AppUsageItem[]>(() => {
    if (!snapshot?.perApp) return [];
    return Object.entries(snapshot.perApp)
      .map(([packageName, mins]) => ({ packageName, minutes: mins }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [snapshot]);
  const topApp = sortedApps[0];

  if (reason) {
    const isBedtime = reason === 'bedtime';
    const unlockText = isBedtime && rules?.bedtimeEnd
      ? tr('arcakids.parental.unlockAt', { time: rules.bedtimeEnd })
      : tr('arcakids.parental.renewsTomorrow');
    return (
      <View style={[styles.container, styles.blockedScreen]}>
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
        <Text style={styles.blockedUnlock}>{unlockText}</Text>
      </View>
    );
  }

  const bedtimeMinutes = minutesUntilBedtime(rules);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.avatar}>{avatar}</Text>
        <Text style={styles.title}>{tr('arcakids.home.hi', { name })}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{tr('arcakids.home.connection')}</Text>
          <Text style={[styles.statusValue, isOnline ? styles.online : styles.offline]}>
            {isOnline ? tr('arcakids.home.online') : tr('arcakids.home.offline')}
          </Text>
        </View>

        {!isLinked ? (
          <Link href={ROUTES.link} asChild>
            <Pressable>
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
            </Pressable>
          </Link>
        ) : null}

        <Card style={styles.heroCard}>
          <Text style={styles.cardLabel}>{tr('arcakids.dashboard.screenTime')}</Text>
          <Text style={styles.heroValue}>
            {remaining != null
              ? tr('arcakids.dashboard.remaining', { time: formatMinutes(remaining) })
              : tr('arcakids.dashboard.todayUsed', { time: formatMinutes(totalMinutes) })}
          </Text>
          {limitPercent != null ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${limitPercent}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.heroCaption}>
                {tr('arcakids.dashboard.usedOf', {
                  used: formatMinutes(totalMinutes),
                  limit: formatMinutes(limit!),
                })}
              </Text>
            </>
          ) : (
            <Text style={styles.heroCaption}>{tr('arcakids.dashboard.noLimit')}</Text>
          )}
        </Card>

        {rules?.bedtimeEnabled && rules.bedtimeStart && rules.bedtimeEnd ? (
          <Card>
            <Text style={styles.cardLabel}>{tr('arcakids.activity.bedtimeStatus')}</Text>
            <Text style={styles.cardValue}>
              {tr('arcakids.activity.bedtimeRange', {
                start: rules.bedtimeStart,
                end: rules.bedtimeEnd,
              })}
            </Text>
            {bedtimeMinutes != null && bedtimeMinutes > 0 ? (
              <Text style={styles.cardCaption}>
                {tr('arcakids.dashboard.bedtimeSoon', {
                  time: formatMinutes(bedtimeMinutes),
                })}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Link href={ROUTES.activity} asChild>
          <Pressable>
            <Card>
              <Text style={styles.cardLabel}>{tr('arcakids.dashboard.todayTitle')}</Text>
              <Text style={styles.cardValue}>
                {tr('arcakids.dashboard.todayUsed', { time: formatMinutes(totalMinutes) })}
              </Text>
              {topApp ? (
                <Text style={styles.cardCaption}>
                  {tr('arcakids.dashboard.topApp', {
                    app: topApp.packageName.split('.').pop(),
                  })}
                </Text>
              ) : (
                <Text style={styles.cardCaption}>{tr('arcakids.dashboard.todayEmpty')}</Text>
              )}
            </Card>
          </Pressable>
        </Link>

        {!achievementsLoading && totalAvailable > 0 ? (
          <Link href={ROUTES.achievements} asChild>
            <Pressable>
              <Card>
                <Text style={styles.cardLabel}>{tr('arcakids.dashboard.achievementsTitle')}</Text>
                <Text style={styles.cardValue}>
                  {tr('arcakids.dashboard.achievementsProgress', {
                    done: totalAchieved,
                    total: totalAvailable,
                  })}
                </Text>
                <Text style={styles.cardCaption}>{tr('arcakids.dashboard.viewAll')}</Text>
              </Card>
            </Pressable>
          </Link>
        ) : null}
      </ScrollView>

      <View style={styles.nav}>
        {isLinked ? (
          <NavItem href={ROUTES.launcher} icon="🎮" label={tr('arcakids.launcher.title')} styles={styles} />
        ) : null}
        <NavItem href={ROUTES.activity} icon="⭐" label={tr('arcakids.home.activity')} styles={styles} />
        <NavItem href={ROUTES.profile} icon="🧒" label={tr('arcakids.home.profile')} styles={styles} />
        <NavItem href={ROUTES.settings} icon="⚙️" label={tr('arcakids.home.settings')} styles={styles} />
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
      paddingTop: spacing.xl,
      gap: spacing.md,
      paddingBottom: spacing.xl,
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
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
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
    heroCard: {
      gap: spacing.sm,
      borderColor: colors.primary,
    },
    cardLabel: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    cardValue: {
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    cardCaption: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    heroValue: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
    },
    heroCaption: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'right',
    },
    progressTrack: {
      height: 10,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    nav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    navItem: {
      alignItems: 'center',
      gap: 2,
      minWidth: 64,
    },
    navIcon: {
      fontSize: 24,
    },
    navLabel: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    blockedScreen: {
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
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
    blockedUnlock: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
      textAlign: 'center',
    },
  });