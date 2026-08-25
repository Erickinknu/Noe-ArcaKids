import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeader } from '@/components/ui/section-header';
import { colors, radius, spacing, typography, shadows } from '@noe-arcakids/shared';
import type { BlockedApp } from '@noe-arcakids/types';

export default function BlockedAppsSection({
  childData,
  onRemoveApp,
}: {
  childData: { blockedApps: BlockedApp[] } | null;
  onRemoveApp: (id: string) => void;
}) {
  const { t: tr } = useTranslation();

  if (!childData) {
    return null;
  }

  if (childData.blockedApps.length === 0) {
    return (
      <EmptyState icon="📱" title={tr('noe.rules.blockedAppsEmpty')} />
    );
  }

  return (
    <Card style={{ ...shadows.sm }}>
      <SectionHeader title={tr('noe.rules.blockedAppsTitle')} />

      <View style={{ gap: spacing.xs, marginBottom: spacing.md }}>
        {childData.blockedApps.map((app) => (
          <View key={app.id} style={styles.appRow}>
            <View style={styles.appInfo}>
              <Text style={styles.appLabel}>{app.appLabel}</Text>
              <Text style={styles.appPackage}>{app.packageName}</Text>
            </View>
            <Pressable onPress={() => onRemoveApp(app.id)}>
              <Text style={styles.removeText}>{tr('noe.rules.removeApp')}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  appList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  appLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  appPackage: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  removeText: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
});