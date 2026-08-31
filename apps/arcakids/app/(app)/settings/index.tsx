import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { setLanguage } from '@/i18n';
import { useParentalStatus } from '@/hooks/use-parental-status';
import { identityService } from '@/features/identity/services/identity-service';
import { parentalBridge } from '@/features/parental/native/parental-bridge';
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  radius,
  spacing,
  typography,
  useAsyncData,
  useTheme,
  type SupportedLanguage,
  type ThemeColors,
  Card,
} from '@noe-arcakids/shared';

export default function SettingsScreen() {
  const { t: tr, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [current, setCurrent] = useState<SupportedLanguage>(i18n.language as SupportedLanguage);
  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());
  const isLinked = Boolean(childInfo?.childId && childInfo?.familyId);
  const {
    rules,
    snapshot,
    hasUsagePermission,
    isLauncher,
  } = useParentalStatus(isLinked);

  function handleSelect(lng: SupportedLanguage) {
    setLanguage(lng);
    setCurrent(lng);
  }

  function handleOpenUsageSettings() {
    void parentalBridge.openUsageAccessSettings();
  }

  function handleOpenLauncherSettings() {
    void parentalBridge.openDefaultAppsSettings();
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('arcakids.home.settings')}</Text>
      {isLinked ? (
        <Card>
          <Text style={styles.cardTitle}>{tr('arcakids.parental.title')}</Text>
          <Text style={styles.cardDescription}>
            {tr('arcakids.parental.description')}
          </Text>

          <View style={styles.statusRow}>
            <View style={styles.statusLabels}>
              <Text style={styles.statusText}>
                {tr('arcakids.parental.usagePermission')}
              </Text>
              <Text
                style={[
                  styles.statusDetail,
                  hasUsagePermission ? styles.statusOk : styles.statusPending,
                ]}
              >
                {hasUsagePermission
                  ? tr('arcakids.parental.usagePermissionGranted')
                  : tr('arcakids.parental.usagePermissionMissing')}
              </Text>
            </View>
            {!hasUsagePermission ? (
              <Pressable
                onPress={handleOpenUsageSettings}
                style={[styles.actionButton, styles.actionButtonPrimary]}
              >
                <Text style={styles.actionButtonText}>
                  {tr('arcakids.parental.grantUsage')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLabels}>
              <Text style={styles.statusText}>
                {tr('arcakids.parental.launcherTitle')}
              </Text>
              <Text
                style={[
                  styles.statusDetail,
                  isLauncher ? styles.statusOk : styles.statusPending,
                ]}
              >
                {isLauncher
                  ? tr('arcakids.parental.launcherActive')
                  : tr('arcakids.parental.launcherInactive')}
              </Text>
            </View>
            {!isLauncher ? (
              <Pressable
                onPress={handleOpenLauncherSettings}
                style={[styles.actionButton, styles.actionButtonPrimary]}
              >
                <Text style={styles.actionButtonText}>
                  {tr('arcakids.parental.setLauncher')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLabels}>
              <Text style={styles.statusText}>
                {tr('arcakids.parental.todayUsage')}
              </Text>
              <Text style={styles.statusDetail}>
                {rules?.dailyLimitMinutes != null
                  ? tr('arcakids.parental.minutesOfLimit', {
                      minutes: snapshot?.totalMinutes ?? 0,
                      limit: rules.dailyLimitMinutes,
                    })
                  : tr('arcakids.parental.minutesValue', {
                      minutes: snapshot?.totalMinutes ?? 0,
                    })}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}
      <Card>
        <Text style={styles.cardTitle}>{tr('settings.language')}</Text>
        <Text style={styles.cardDescription}>
          {tr('settings.languageDescription')}
        </Text>
        <View style={styles.options}>
          {SUPPORTED_LANGUAGES.map((lng) => {
            const selected = lng === current;
            return (
              <Pressable
                key={lng}
                onPress={() => handleSelect(lng)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {LANGUAGE_NAMES[lng]}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>
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
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cardDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusLabels: {
    flex: 1,
    gap: 2,
  },
  statusText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  statusDetail: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  statusOk: {
    color: colors.success,
  },
  statusPending: {
    color: colors.warning,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.onPrimary,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  check: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});
