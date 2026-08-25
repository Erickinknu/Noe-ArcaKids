import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { storage } from '@noe-arcakids/storage';
import { colors, shadows, spacing, typography } from '@noe-arcakids/shared';

const NOTIFICATION_KEYS = {
  pushEnabled: 'noe/notifications/pushEnabled',
  dailyReport: 'noe/notifications/dailyReport',
  bedtimeAlert: 'noe/notifications/bedtimeAlert',
  screenTimeAlert: 'noe/notifications/screenTimeAlert',
  offlineAlert: 'noe/notifications/offlineAlert',
} as const;

export default function NotificationsScreen() {
  const { t: tr } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    pushEnabled: true,
    dailyReport: true,
    bedtimeAlert: true,
    screenTimeAlert: true,
    offlineAlert: false,
  });

  async function loadPrefs() {
    try {
      const [push, daily, bedtime, screen, offline] = await Promise.all([
        storage.get(NOTIFICATION_KEYS.pushEnabled),
        storage.get(NOTIFICATION_KEYS.dailyReport),
        storage.get(NOTIFICATION_KEYS.bedtimeAlert),
        storage.get(NOTIFICATION_KEYS.screenTimeAlert),
        storage.get(NOTIFICATION_KEYS.offlineAlert),
      ]);
      setPrefs({
        pushEnabled: push !== 'false',
        dailyReport: daily !== 'false',
        bedtimeAlert: bedtime !== 'false',
        screenTimeAlert: screen !== 'false',
        offlineAlert: offline === 'true',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrefs();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      setSaving(false);
    } catch {
      setSaving(false);
    }
  }

  // Track if data has been loaded at least once
  const [hasLoaded] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <SectionHeader title={tr('noe.notifications.title')} />
        {loading ? (
          <LoadingState text={tr('noe.notifications.loading')} />
        ) : (
          <View style={styles.form}>
            <Switch
              testID="push-switch"
              value={prefs.pushEnabled}
              onValueChange={() => setPrefs((p) => ({ ...p, pushEnabled: !p.pushEnabled }))}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.notifications.pushEnabled')}</Text>
            </Switch>

            <Switch
              testID="daily-switch"
              value={prefs.dailyReport}
              onValueChange={() => setPrefs((p) => ({ ...p, dailyReport: !p.dailyReport }))}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.notifications.dailyReport')}</Text>
            </Switch>

            <Switch
              testID="bedtime-switch"
              value={prefs.bedtimeAlert}
              onValueChange={() => setPrefs((p) => ({ ...p, bedtimeAlert: !p.bedtimeAlert }))}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.notifications.bedtimeAlert')}</Text>
            </Switch>

            <Switch
              testID="screen-switch"
              value={prefs.screenTimeAlert}
              onValueChange={() => setPrefs((p) => ({ ...p, screenTimeAlert: !p.screenTimeAlert }))}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.notifications.screenTimeAlert')}</Text>
            </Switch>

            <Switch
              testID="offline-switch"
              value={prefs.offlineAlert}
              onValueChange={() => setPrefs((p) => ({ ...p, offlineAlert: !p.offlineAlert }))}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.notifications.offlineAlert')}</Text>
            </Switch>
          </View>
        )}

        {hasLoaded && !loading ? (
          <View style={styles.flash}>
            <Text style={styles.flashText}>{tr('noe.notifications.savedFlash')}</Text>
          </View>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button onPress={handleSave} loading={saving}>
          {tr('noe.notifications.save')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  card: {
    ...shadows.sm,
  },
  form: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actions: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  flash: {
    padding: spacing.md,
    backgroundColor: colors.success,
  },
  flashText: {
    color: colors.success,
    fontSize: typography.fontSizes.body,
  },
});