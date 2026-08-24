import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAsyncData } from '@/hooks/use-async-data';
import { identityService } from '@/features/identity/services/identity-service';
import {
  parentalService,
} from '@/features/parental/services/parental-service';
import {
  parentalBridge,
  type LaunchableApp,
} from '@/features/parental/native/parental-bridge';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const TILE_COLORS = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

function tileColor(packageName: string): string {
  let hash = 0;
  for (let i = 0; i < packageName.length; i += 1) {
    hash = (hash * 31 + packageName.charCodeAt(i)) % 997;
  }
  return TILE_COLORS[hash % TILE_COLORS.length];
}

export default function LauncherScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { data, loading, error } = useAsyncData(async () => {
    const device = await identityService.getLocalDevice();
    const [apps, rules] = await Promise.all([
      parentalBridge.getLaunchableApps(),
      parentalService.getRulesForDevice(device.deviceUuid).catch(() => null),
    ]);
    return { apps, rules };
  });

  const blocked = new Set(data?.rules?.blockedPackages ?? []);
  const visibleApps = (data?.apps ?? []).filter(
    (app) => !blocked.has(app.packageName)
  );

  function handlePress(app: LaunchableApp) {
    void parentalBridge.launchApp(app.packageName);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>{tr('arcakids.launcher.title')}</Text>
      </View>

      {error ? (
        <Text style={styles.message}>{tr('common.unexpected')}</Text>
      ) : loading ? (
        <Text style={styles.message}>{tr('common.loading')}</Text>
      ) : visibleApps.length === 0 ? (
        <Text style={styles.message}>{tr('arcakids.launcher.empty')}</Text>
      ) : (
        <FlatList
          data={visibleApps}
          keyExtractor={(item) => item.packageName}
          numColumns={4}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.tile}
              onPress={() => handlePress(item)}
              android_ripple={{ color: colors.border }}
            >
              <View
                style={[styles.icon, { backgroundColor: tileColor(item.packageName) }]}
              >
                <Text style={styles.iconText}>
                  {item.label.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.label}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 60,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  backText: {
    fontSize: typography.fontSizes.title,
    color: colors.text,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  message: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  grid: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    maxWidth: '100%',
  },
});
