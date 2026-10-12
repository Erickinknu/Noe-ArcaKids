import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { pinService } from '@/features/pin/services/pin-service';
import { pinSyncService } from '@/features/pin/services/pin-sync-service';
import { analyticsService } from '@/features/analytics/services/analytics-service';
import { authService } from '@/features/auth/services/auth-service';
import { biometricService } from '@/features/security/services/biometric-service';
import {
  lockService,
  INACTIVITY_OPTIONS,
  type InactivityMinutes,
} from '@/features/security/services/lock-service';
import { useAsyncData, errorMessage, networkService, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

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
  const [analytics, setAnalytics] = useState(true);
  const [inactivity, setInactivity] = useState<InactivityMinutes>(1);

  // Flujo "Olvidé mi PIN": exige la contraseña de la cuenta para restablecerlo.
  const [forgetOpen, setForgetOpen] = useState(false);
  const [forgetPassword, setForgetPassword] = useState('');
  const [forgetSaving, setForgetSaving] = useState(false);
  const [forgetError, setForgetError] = useState<string | null>(null);
  const [forgetDone, setForgetDone] = useState(false);

  const load = useCallback(async () => {
    const [lock, bio, supported, hide, minutes, analyticsOn] = await Promise.all([
      pinService.isLockOnOpenEnabled(),
      biometricService.isEnabled(),
      biometricService.isSupported(),
      lockService.isHidePreviewEnabled(),
      lockService.getInactivityMinutes(),
      analyticsService.isEnabled(),
    ]);
    setLockOnOpen(lock);
    setBioEnabled(bio);
    setBioSupported(supported);
    setHidePreview(hide);
    setInactivity(minutes);
    setAnalytics(analyticsOn);
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

  async function onToggleAnalytics(value: boolean) {
    setAnalytics(value);
    await analyticsService.setEnabled(value);
  }

  function openForget() {
    setForgetOpen(true);
    setForgetPassword('');
    setForgetError(null);
    setForgetDone(false);
  }

  async function onConfirmForget() {
    setForgetError(null);
    if (!forgetPassword) {
      setForgetError(tr('noe.forgetPinScreen.wrongPassword'));
      return;
    }
    if (!networkService.isOnline()) {
      setForgetError(tr('noe.forgetPinScreen.offline'));
      return;
    }
    setForgetSaving(true);
    try {
      const ok = await authService.verifyPassword(forgetPassword);
      if (!ok) {
        setForgetError(tr('noe.forgetPinScreen.wrongPassword'));
        return;
      }
      await pinService.reset();
      await pinSyncService.clearPinFromFamily();
      setForgetPassword('');
      setLockOnOpen(false);
      setForgetDone(true);
    } catch (cause) {
      setForgetError(errorMessage(cause));
    } finally {
      setForgetSaving(false);
    }
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

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{tr('noe.security.analytics')}</Text>
            <Text style={styles.rowSubtitle}>{tr('noe.security.analyticsDesc')}</Text>
          </View>
          <Switch
            value={analytics}
            onValueChange={onToggleAnalytics}
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

      <Pressable
        style={styles.linkRow}
        onPress={() => (forgetOpen ? setForgetOpen(false) : openForget())}
      >
        <MaterialIcons name="help-outline" size={22} color={colors.primary} />
        <View style={styles.rowText}>
          <Text style={styles.linkText}>{tr('noe.security.forgetPin')}</Text>
          <Text style={styles.rowSubtitle}>{tr('noe.security.forgetPinHint')}</Text>
        </View>
        <MaterialIcons
          name={forgetOpen ? 'expand-less' : 'expand-more'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>

      {forgetOpen ? (
        <View style={styles.card}>
          <Text style={styles.rowTitle}>{tr('noe.forgetPinScreen.title')}</Text>
          <Text style={styles.rowSubtitle}>{tr('noe.forgetPinScreen.subtitle')}</Text>

          {forgetDone ? (
            <View style={styles.forgetDone}>
              <MaterialIcons name="check-circle" size={40} color={colors.success} />
              <Text style={styles.forgetDoneText}>{tr('noe.forgetPinScreen.resetDone')}</Text>
              <Button onPress={() => router.push('/profile/pin')}>
                {tr('noe.forgetPinScreen.createNew')}
              </Button>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>{tr('noe.forgetPinScreen.passwordLabel')}</Text>
              <TextInput
                style={styles.passwordInput}
                value={forgetPassword}
                onChangeText={(value) => {
                  setForgetPassword(value);
                  setForgetError(null);
                }}
                placeholder={tr('noe.forgetPinScreen.passwordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              {forgetError ? (
                <View style={styles.forgetErrorRow}>
                  <MaterialIcons name="error" size={18} color={colors.danger} />
                  <Text style={styles.forgetErrorText}>{forgetError}</Text>
                </View>
              ) : null}
              <Button onPress={onConfirmForget} loading={forgetSaving} disabled={!forgetPassword}>
                {tr('noe.forgetPinScreen.confirm')}
              </Button>
            </>
          )}
        </View>
      ) : null}

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
    fieldLabel: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    passwordInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: typography.fontSizes.body,
      color: colors.text,
      backgroundColor: colors.background,
    },
    forgetErrorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    forgetErrorText: {
      flex: 1,
      fontSize: typography.fontSizes.caption,
      color: colors.danger,
    },
    forgetDone: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    forgetDoneText: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.success,
      textAlign: 'center',
    },
  });
