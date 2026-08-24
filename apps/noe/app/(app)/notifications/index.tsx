import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { storage } from '@noe-arcakids/storage';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

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

  useEffect(() => {
    loadPrefs();
  }, []);

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

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        storage.save(NOTIFICATION_KEYS.pushEnabled, String(prefs.pushEnabled)),
        storage.save(NOTIFICATION_KEYS.dailyReport, String(prefs.dailyReport)),
        storage.save(NOTIFICATION_KEYS.bedtimeAlert, String(prefs.bedtimeAlert)),
        storage.save(NOTIFICATION_KEYS.screenTimeAlert, String(prefs.screenTimeAlert)),
        storage.save(NOTIFICATION_KEYS.offlineAlert, String(prefs.offlineAlert)),
      ]);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: keyof typeof prefs) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <SectionHeader title={tr('noe.notifications.title')} />

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowLabel}>{tr('noe.notifications.pushEnabled')}</Text>
            <Text style={styles.rowDescription}>{tr('noe.notifications.pushEnabledDesc')}</Text>
          </View>
          <Switch value={prefs.pushEnabled} onValueChange={() => toggle('pushEnabled')} trackColor={{ true: colors.primary }} />
        </View>
      </Card>

      {prefs.pushEnabled && (
        <>
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{tr('noe.notifications.dailyReport')}</Text>
                <Text style={styles.rowDescription}>{tr('noe.notifications.dailyReportDesc')}</Text>
              </View>
              <Switch value={prefs.dailyReport} onValueChange={() => toggle('dailyReport')} trackColor={{ true: colors.primary }} />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{tr('noe.notifications.bedtimeAlert')}</Text>
                <Text style={styles.rowDescription}>{tr('noe.notifications.bedtimeAlertDesc')}</Text>
              </View>
              <Switch value={prefs.bedtimeAlert} onValueChange={() => toggle('bedtimeAlert')} trackColor={{ true: colors.primary }} />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{tr('noe.notifications.screenTimeAlert')}</Text>
                <Text style={styles.rowDescription}>{tr('noe.notifications.screenTimeAlertDesc')}</Text>
              </View>
              <Switch value={prefs.screenTimeAlert} onValueChange={() => toggle('screenTimeAlert')} trackColor={{ true: colors.primary }} />
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>{tr('noe.notifications.offlineAlert')}</Text>
                <Text style={styles.rowDescription}>{tr('noe.notifications.offlineAlertDesc')}</Text>
              </View>
              <Switch value={prefs.offlineAlert} onValueChange={() => toggle('offlineAlert')} trackColor={{ true: colors.primary }} />
            </View>
          </Card>
        </>
      )}

      <Button onPress={handleSave} loading={saving}>
        {tr('noe.notifications.save')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  card: {
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  rowLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  rowDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
