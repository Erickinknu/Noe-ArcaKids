import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { deviceOwnerBridge } from '@/features/device-control/native/device-owner-module';
import { linkingService } from '@/features/linking/services/linking-service';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { parentalBridge } from '@/features/parental/native/parental-bridge';
import { Card, Input, errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const CODE_LENGTH = 8;

export default function OnboardingScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [usageGranted, setUsageGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);

  // Auto-link from Device Owner provisioning extras (set during setup).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const extras = await deviceOwnerBridge.getProvisioningExtras();
        if (!mounted) return;
        const value = extras?.payload || extras?.code;
        if (!value) return;
        if (linkingService.isValidCode(value)) {
          setCode(linkingService.sanitizeCode(value));
        }
        setLinking(true);
        setError(null);
        try {
          await linkingService.redeem(value.trim());
          await onboardingService.markCompleted();
          await deviceOwnerBridge.clearProvisioningExtras().catch(() => undefined);
          if (mounted) router.replace(ROUTES.app);
        } catch (cause) {
          if (mounted) setError(errorMessage(cause));
        } finally {
          if (mounted) setLinking(false);
        }
      } catch {
        // no provisioning extras
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Live permission status while the permissions step is shown.
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const [usage, overlay] = await Promise.all([
          parentalBridge.hasUsageStatsPermission(),
          deviceOwnerBridge.hasOverlayPermission(),
        ]);
        if (mounted) {
          setUsageGranted(usage);
          setOverlayGranted(overlay);
        }
      } catch {
        // ignore
      }
    };
    void check();
    const timer = setInterval(check, 2000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  async function handleLink() {
    if (code.trim().length === 0) return;
    setLinking(true);
    setError(null);
    try {
      await linkingService.redeem(code.trim());
      await onboardingService.markCompleted();
      await deviceOwnerBridge.clearProvisioningExtras().catch(() => undefined);
      router.replace(ROUTES.app);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLinking(false);
    }
  }

  if (step === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.mascot}>🧸</Text>
        <Text style={styles.title}>{tr('arcakids.onboarding.welcome')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.welcomeText')}</Text>
        <Button onPress={() => setStep(1)}>{tr('arcakids.onboarding.start')}</Button>
      </View>
    );
  }

  if (step === 1) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>{tr('arcakids.onboarding.permissionsTitle')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.permissionsText')}</Text>
        <Card>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionName}>{tr('arcakids.parental.usagePermission')}</Text>
            <Text style={usageGranted ? styles.permissionOk : styles.permissionPending}>
              {usageGranted
                ? tr('arcakids.parental.usagePermissionGranted')
                : tr('arcakids.parental.usagePermissionMissing')}
            </Text>
            {!usageGranted ? (
              <Button variant="outline" onPress={() => void parentalBridge.openUsageAccessSettings()}>
                {tr('arcakids.parental.grantUsage')}
              </Button>
            ) : null}
          </View>
          <View style={styles.permissionRow}>
            <Text style={styles.permissionName}>{tr('arcakids.parental.overlayTitle')}</Text>
            <Text style={overlayGranted ? styles.permissionOk : styles.permissionPending}>
              {overlayGranted
                ? tr('arcakids.parental.overlayPermissionGranted')
                : tr('arcakids.parental.overlayPermissionMissing')}
            </Text>
            {!overlayGranted ? (
              <Button variant="outline" onPress={() => void deviceOwnerBridge.openOverlaySettings()}>
                {tr('arcakids.parental.grantOverlay')}
              </Button>
            ) : null}
          </View>
        </Card>
        <Button onPress={() => setStep(2)}>{tr('arcakids.onboarding.next')}</Button>
        <Pressable onPress={() => setStep(0)}>
          <Text style={styles.back}>{tr('arcakids.onboarding.back')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('arcakids.onboarding.codeTitle')}</Text>
      <Text style={styles.description}>{tr('arcakids.onboarding.codeText')}</Text>
      {linking ? (
        <Text style={styles.provisioning}>{tr('arcakids.onboarding.provisioningDetected')}</Text>
      ) : null}
      <Input
        label={tr('arcakids.onboarding.codeTypeLabel')}
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, CODE_LENGTH));
          setError(null);
        }}
        placeholder={tr('arcakids.onboarding.codeTypePlaceholder')}
      />
      <Button onPress={handleLink} loading={linking} disabled={code.trim().length === 0}>
        {tr('arcakids.onboarding.linkButton')}
      </Button>
      <Pressable onPress={() => setStep(1)}>
        <Text style={styles.back}>{tr('arcakids.onboarding.back')}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  mascot: {
    fontSize: 64,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  provisioning: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    textAlign: 'center',
  },
  permissionRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  permissionName: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  permissionOk: {
    fontSize: typography.fontSizes.caption,
    color: colors.success,
  },
  permissionPending: {
    fontSize: typography.fontSizes.caption,
    color: colors.warning,
  },
  back: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
});