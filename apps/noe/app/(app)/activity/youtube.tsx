import { useMemo, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

import { activityService, type ChildUsageSummary } from '@/features/activity/services/activity-service';

export default function YoutubeScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { childId } = useLocalSearchParams<{ childId?: string }>();
  const [usage, setUsage] = useState<ChildUsageSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!childId) {
        if (mounted) setUsage(null);
        return;
      }
      const data = await activityService.getChildUsageByPackage(childId, 1);
      if (mounted) setUsage(data);
    }
    load();
    return () => { mounted = false; };
  }, [childId]);

  if (!usage) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      >
        <Text style={styles.description}>Cargando...</Text>
      </ScrollView>
    );
  }

  const noData = !usage.packageUsages || usage.packageUsages.length === 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>YouTube - Videos vistos</Text>
      </Pressable>
      <Text style={styles.description}>Videos que tu hijo ha visto recientemente en YouTube.</Text>

      {noData ? (
        <EmptyState
          icon="🎬"
          title="No hay datos de YouTube"
          description="Aún no hay registro de videos vistos en los últimos 7 días."
        />
      ) : (
        <View>
          <Text style={styles.subTitle}>Total de minutos: {usage.totalMinutes}</Text>
          <View style={styles.packageList}>
            {usage.packageUsages.map((pkg, i) => (
              <View key={pkg.packageName} style={[{ padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }]}>
                <Text style={[{ flex: 1, fontWeight: typography.fontWeights.medium }]}>{pkg.packageName}</Text>
                <Text style={[{ textAlign: 'right' }]}>{pkg.minutes} min</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
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
  description: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  subTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  packageList: {
    gap: spacing.md,
  }
});