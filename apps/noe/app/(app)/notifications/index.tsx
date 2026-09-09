import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { storage } from '@noe-arcakids/storage';
import { Card, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';
import { useScreenPadding } from '@/hooks/use-screen-padding';

const NOTIFICATION_KEYS = {
  pushEnabled: 'noe/notifications/pushEnabled',
  dailyReport: 'noe/notifications/dailyReport',
  bedtimeAlert: 'noe/notifications/bedtimeAlert',
  screenTimeAlert: 'noe/notifications/screenTimeAlert',
  offlineAlert: 'noe/notifications/offlineAlert',
  weeklyVerse: 'noe/notifications/weeklyVerse',
} as const;

export default function NotificationsScreen() {
  const { t: tr } = useTranslation();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [prefs, setPrefs] = useState({
    pushEnabled: true,
    dailyReport: true,
    bedtimeAlert: true,
    screenTimeAlert: true,
    offlineAlert: false,
    weeklyVerse: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadPrefs() {
      try {
        const [push, daily, bedtime, screen, offline, weekly] = await Promise.all([
          storage.get(NOTIFICATION_KEYS.pushEnabled),
          storage.get(NOTIFICATION_KEYS.dailyReport),
          storage.get(NOTIFICATION_KEYS.bedtimeAlert),
          storage.get(NOTIFICATION_KEYS.screenTimeAlert),
          storage.get(NOTIFICATION_KEYS.offlineAlert),
          storage.get(NOTIFICATION_KEYS.weeklyVerse),
        ]);
        if (!cancelled) {
          setPrefs({
            pushEnabled: push !== 'false',
            dailyReport: daily !== 'false',
            bedtimeAlert: bedtime !== 'false',
            screenTimeAlert: screen !== 'false',
            offlineAlert: offline === 'true',
            weeklyVerse: weekly === 'true',
          });
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPrefs();
    return () => { cancelled = true; };
  }, []);

  async function handleSave() {
    setSaving(true);
    setSavedFlash(false);
    try {
      await Promise.all([
        storage.save(NOTIFICATION_KEYS.pushEnabled, String(prefs.pushEnabled)),
        storage.save(NOTIFICATION_KEYS.dailyReport, String(prefs.dailyReport)),
        storage.save(NOTIFICATION_KEYS.bedtimeAlert, String(prefs.bedtimeAlert)),
        storage.save(NOTIFICATION_KEYS.screenTimeAlert, String(prefs.screenTimeAlert)),
        storage.save(NOTIFICATION_KEYS.offlineAlert, String(prefs.offlineAlert)),
        storage.save(NOTIFICATION_KEYS.weeklyVerse, String(prefs.weeklyVerse)),
      ]);
      setSavedFlash(true);
    } catch {
      // save failed silently — prefs remain as-is
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <SectionHeader title={tr('noe.notifications.title')} />
        {loading ? (
          <LoadingState text={tr('common.loading')} />
        ) : (
          <View style={styles.form}>
            <SwitchRow
              value={prefs.pushEnabled}
              onToggle={() => setPrefs((p) => ({ ...p, pushEnabled: !p.pushEnabled }))}
              label={tr('noe.notifications.pushEnabled')}
              colors={colors}
              styles={styles}
            />
            <SwitchRow
              value={prefs.dailyReport}
              onToggle={() => setPrefs((p) => ({ ...p, dailyReport: !p.dailyReport }))}
              label={tr('noe.notifications.dailyReport')}
              colors={colors}
              styles={styles}
            />
            <SwitchRow
              value={prefs.bedtimeAlert}
              onToggle={() => setPrefs((p) => ({ ...p, bedtimeAlert: !p.bedtimeAlert }))}
              label={tr('noe.notifications.bedtimeAlert')}
              colors={colors}
              styles={styles}
            />
            <SwitchRow
              value={prefs.screenTimeAlert}
              onToggle={() => setPrefs((p) => ({ ...p, screenTimeAlert: !p.screenTimeAlert }))}
              label={tr('noe.notifications.screenTimeAlert')}
              colors={colors}
              styles={styles}
            />
            <SwitchRow
              value={prefs.offlineAlert}
              onToggle={() => setPrefs((p) => ({ ...p, offlineAlert: !p.offlineAlert }))}
              label={tr('noe.notifications.offlineAlert')}
              colors={colors}
              styles={styles}
            />
            <SwitchRow
              value={prefs.weeklyVerse}
              onToggle={() => setPrefs((p) => ({ ...p, weeklyVerse: !p.weeklyVerse }))}
              label={tr('noe.notifications.weeklyVerse')}
              description={tr('noe.notifications.weeklyVerseDesc')}
              colors={colors}
              styles={styles}
            />
          </View>
        )}

        {loadError ? <Text style={styles.errorText}>{tr('noe.notifications.loadError')}</Text> : null}

        {savedFlash ? (
          <View style={styles.flash}>
            <Text style={styles.flashText}>{tr('noe.notifications.savedFlash')}</Text>
          </View>
        ) : null}
      </Card>

      {!loading ? (
        <Button onPress={handleSave} loading={saving}>
          {tr('noe.notifications.save')}
        </Button>
      ) : null}
    </ScrollView>
  );
}

/** Switch + label in a Row — fixes Android ViewGroup crash from Switch(children). */
function SwitchRow({
  value,
  onToggle,
  label,
  description,
  colors,
  styles,
}: {
  value: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchTextGroup}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description ? <Text style={styles.switchDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.surface, true: colors.primary }}
        thumbColor={colors.primary}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
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
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  switchTextGroup: {
    flex: 1,
    gap: 2,
  },
  switchLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  switchDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  flash: {
    padding: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.sm,
  },
  flashText: {
    color: colors.success,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
  },
});