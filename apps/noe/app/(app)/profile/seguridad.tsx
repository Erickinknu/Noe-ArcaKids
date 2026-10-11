import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { pinService } from '@/features/pin/services/pin-service';
import { biometricService } from '@/features/security/services/biometric-service';
import {
  lockService,
  INACTIVITY_OPTIONS,
  type InactivityMinutes,
} from '@/features/security/services/lock-service';
import { useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function SecurityScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const screenPadding = useScreenPadding();

  const [lockOnOpen, setLockOnOpen] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const [hidePreview, setHidePreview] = useState(false);
  const [inactivity, setInactivity] = useState<InactivityMinutes>(1);

  const load = useCallback(async () => {
    const [lock, bio, supported, hide, minutes] = await Promise.all([
      pinService.isLockOnOpenEnabled(),
      biometricService.isEnabled(),
      biometricService.isSupported(),
      lockService.isHidePreviewEnabled(),
      lockService.getInactivityMinutes(),
    ]);
    setLockOnOpen(lock);
    setBioEnabled(bio);
    setBioSupported(supported);
    setHidePreview(hide);
    setInactivity(minutes);
  }, []);
  useAsyncData<null>(async () => {
    await load();
    return null;
  }, () => {});

  async function onToggleLock(value: boolean) {
    const hasPin = await pinService.isEnabled();
    if (value && !hasPin) {
      router.push('/profile/pin');
      return;
    }
    setLockOnOpen(value);
    await pinService.setLockOnOpenEnabled(value);
  }

  async function onToggleBio(value: boolean) {
    const ok = await biometricService.setEnabled(value);
    setBioEnabled(ok);
  }

  async function onSelectInactivity(minutes: InactivityMinutes) {
    setInactivity(minutes);
    await lockService.setInactivityMinutes(minutes);
  }

  async function onToggleHidePreview(value: boolean) {
    setHidePreview(value);
    await lockService.setHidePreviewEnabled(value);
  }

  const inactivityLabel = (minutes: InactivityMinutes) => {
    switch (minutes) {
      case 0:
        return tr('noe.security.inactivityOptions.immediate');
      case 1:
        return tr('noe.security.inactivityOptions.oneMin');
      case 5:
        return tr('noe.security.inactivityOptions.fiveMin');
      default:
        return tr('noe.security.inactivityOptions.fifteenMin');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: screenPadding.paddingTop }]}
    >
      <Text style={styles.headerTitle}>{tr('noe.security.title')}</Text>
      <Text style={styles.headerSubtitle}>{tr('noe.security.subtitle')}</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tr('noe.security.lockOnOpen')}</Text>
            <Text style={styles.rowSubtitle}>{tr('noe.security.lockOnOpenDesc')}</Text>
          </View>
          <Switch
            value={lockOnOpen}
            onValueChange={onToggleLock}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tr('noe.security.biometric')}</Text>
            <Text style={styles.rowSubtitle}>
              {bioSupported
                ? tr('noe.security.biometricDesc')
                : tr('noe.security.biometricUnavailable')}
            </Text>
          </View>
          <Switch
            value={bioEnabled}
            disabled={!bioSupported}
            onValueChange={onToggleBio}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tr('noe.security.hidePreview')}</Text>
            <Text style={styles.rowSubtitle}>{tr('noe.security.hidePreviewDesc')}</Text>
          </View>
          <Switch
            value={hidePreview}
            onValueChange={onToggleHidePreview}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.onPrimary}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.rowTitle}>{tr('noe.security.inactivity')}</Text>
        <Text style={styles.rowSubtitle}>{tr('noe.security.inactivityDesc')}</Text>
        <View style={styles.options}>
          {INACTIVITY_OPTIONS.map((minutes) => (
            <Pressable
              key={minutes}
              style={[styles.option, inactivity === minutes && styles.optionActive]}
              onPress={() => onSelectInactivity(minutes)}
            >
              <Text
                style={[
                  styles.optionText,
                  inactivity === minutes && styles.optionTextActive,
                ]}
              >
                {inactivityLabel(minutes)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={styles.linkRow} onPress={() => router.push('/profile/pin')}>
        <MaterialIcons name="lock" size={22} color={colors.primary} />
        <Text style={styles.linkText}>{tr('noe.security.changePin')}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>

      <Pressable style={styles.linkRow} onPress={() => router.push('/(auth)/forgot-password')}>
        <MaterialIcons name="help-outline" size={22} color={colors.primary} />
        <View style={styles.rowText}>
          <Text style={styles.linkText}>{tr('noe.security.forgetPin')}</Text>
          <Text style={styles.rowSubtitle}>{tr('noe.security.forgetPinHint')}</Text>
        </View>
      </Pressable>

      <Text style={styles.note}>{tr('noe.security.offlineNote')}</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    headerTitle: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      marginTop: -spacing.sm,
    },
    card: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.borderLight,
    },
    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    option: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionText: {
      color: colors.text,
      fontSize: typography.fontSizes.caption,
    },
    optionTextActive: {
      color: colors.primary,
      fontWeight: typography.fontWeights.semibold,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    linkText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.medium,
    },
    note: {
      textAlign: 'center',
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
  });
