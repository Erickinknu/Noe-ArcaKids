import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { activityService, type ChildUsageSummary } from '@/features/activity/services/activity-service';
import { Card, useTheme, useAsyncData, spacing, typography, radius, type ThemeColors } from '@noe-arcakids/shared';

export default function AppsScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = useCallback(
    () =>
      childId
        ? activityService.getChildUsageByPackage(childId, 1)
        : Promise.resolve(null),
    [childId]
  );
  const { data: usage, loading, error, reload } = useAsyncData(fetchUsage);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  if (loading && !usage) return <LoadingState text={tr('noe.activity.loading')} />;
  if (error && !usage) return <ErrorState message={error} onRetry={reload} />;

  const summary = usage as ChildUsageSummary | null;
  const hasData = summary !== null && summary.packageUsages.length > 0;
  const maxMinutes =
    summary && summary.packageUsages.length > 0
      ? Math.max(...summary.packageUsages.map((p) => p.minutes), 1)
      : 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <Pressable style={({ pressed }) => [styles.backBtn, pressed && styles.backPressed]} onPress={() => router.replace('/(app)/activity')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Apps instaladas</Text>
      </View>
      <Text style={styles.description}>
        Aplicaciones usadas en el dispositivo de tu hijo hoy.
      </Text>

      {hasData && summary ? (
        <>
          <Card style={styles.summaryCard}>
            <MaterialIcons name="timer" size={20} color={colors.primary} />
            <Text style={styles.summaryText}>
              {tr('arcakids.activity.totalUsed')}: {summary.totalMinutes} min
            </Text>
          </Card>

          {summary.packageUsages.map((pkg) => (
            <Card key={pkg.packageName} style={styles.appCard}>
              <View style={styles.appRow}>
                <Text style={styles.appName} numberOfLines={1}>
                  {pkg.appLabel ?? friendlyName(pkg.packageName)}
                </Text>
                <Text style={styles.appMinutes}>{pkg.minutes} min</Text>
              </View>
              <View style={styles.appBarBg}>
                <View
                  style={[
                    styles.appBarFill,
                    { width: `${(pkg.minutes / maxMinutes) * 100}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
              <Text style={styles.appPackage} numberOfLines={1}>{pkg.packageName}</Text>
            </Card>
          ))}
        </>
      ) : (
        <EmptyState
          icon="📱"
          title="Aún no hay datos de apps"
          description="Las aplicaciones usadas aparecerán aquí cuando el dispositivo de tu hijo reporte esta información."
        />
      )}
    </ScrollView>
  );
}

function friendlyName(packageName: string): string {
  const map: Record<string, string> = {
    'com.android.chrome': 'Chrome',
    'com.brave.browser': 'Brave',
    'org.mozilla.firefox': 'Firefox',
    'com.google.android.youtube': 'YouTube',
    'com.instagram.android': 'Instagram',
    'com.facebook.katana': 'Facebook',
    'com.zhiliaoapp.musically': 'TikTok',
    'com.snapchat.android': 'Snapchat',
    'com.twitter.android': 'Twitter',
    'com.whatsapp': 'WhatsApp',
    'com.google.android.apps.messaging': 'Mensajes',
    'com.google.android.apps.photos': 'Fotos',
    'com.netflix.mediaclient': 'Netflix',
    'com.spotify.music': 'Spotify',
    'com.google.android.gm': 'Gmail',
    'com.google.android.apps.maps': 'Maps',
  };
  return map[packageName] ?? packageName.split('.').pop() ?? packageName;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    backBtn: { padding: 4, borderRadius: radius.sm },
    backPressed: { opacity: 0.6 },
    headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
    description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
    summaryCard: {
      padding: spacing.md,
      borderRadius: radius.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primaryLight,
    },
    summaryText: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.primary },
    appCard: { gap: spacing.sm },
    appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    appName: { flex: 1, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
    appMinutes: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.bold, color: colors.text },
    appBarBg: { height: 6, backgroundColor: colors.borderLight, borderRadius: radius.full, overflow: 'hidden' },
    appBarFill: { height: '100%', borderRadius: radius.full },
    appPackage: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  });