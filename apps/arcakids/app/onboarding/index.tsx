import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { deviceOwnerBridge } from '@/features/device-control/native/device-owner-module';
import { linkingService } from '@/features/linking/services/linking-service';
import { locationModule } from '@/features/location/native/location-module';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { parentalBridge } from '@/features/parental/native/parental-bridge';
import { Card, Input, errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const CODE_LENGTH = 6;

type StepKind = 'welcome' | 'code' | 'location' | 'usage' | 'overlay' | 'admin' | 'done';

const PERMISSION_POLL_MS = 1500;

function usePermissionGate(
  check: (() => Promise<boolean>) | null,
  onGranted: () => void,
): boolean | null {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!check) {
      return;
    }
    let stop = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      let ok = false;
      try {
        ok = await check();
      } catch {
        ok = false;
      }
      if (stop) return;
      setGranted(ok);
      if (ok) {
        if (timer) clearInterval(timer);
        onGranted();
      }
    };

    void run();
    timer = setInterval(run, PERMISSION_POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });

    return () => {
      stop = true;
      if (timer) clearInterval(timer);
      subscription.remove();
    };
  }, [check, onGranted]);

  return granted;
}

export default function OnboardingScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState<StepKind>('welcome');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

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

  // Detect Device Owner status once (used by the admin screen).
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const state = await deviceOwnerBridge.getState();
        if (mounted) setIsOwner(state.isDeviceOwner);
      } catch {
        if (mounted) setIsOwner(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const checkLocation = useCallback(
    async () => locationModule.hasPermission(),
    [],
  );
  const checkUsage = useCallback(
    async () => parentalBridge.hasUsageStatsPermission(),
    [],
  );
  const checkOverlay = useCallback(
    async () => deviceOwnerBridge.hasOverlayPermission(),
    [],
  );
  const checkAdmin = useCallback(async () => {
    const state = await deviceOwnerBridge.getState();
    return state.isDeviceOwner || state.isAdminActive;
  }, []);

  const goUsage = useCallback(() => setStep('usage'), []);
  const goOverlay = useCallback(() => setStep('overlay'), []);
  const goAdmin = useCallback(() => setStep('admin'), []);
  const goDone = useCallback(() => setStep('done'), []);

  const locationGranted = usePermissionGate(
    step === 'location' ? checkLocation : null,
    goUsage,
  );
  const usageGranted = usePermissionGate(
    step === 'usage' ? checkUsage : null,
    goOverlay,
  );
  const overlayGranted = usePermissionGate(
    step === 'overlay' ? checkOverlay : null,
    goAdmin,
  );
  const adminGranted = usePermissionGate(
    step === 'admin' ? checkAdmin : null,
    goDone,
  );

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

  function renderStepHeading(titleKey: string, stepKey: string) {
    return (
      <>
        <Text style={styles.step}>{tr(stepKey)}</Text>
        <Text style={styles.title}>{tr(titleKey)}</Text>
      </>
    );
  }

  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.mascot}>🧸</Text>
        <Text style={styles.title}>{tr('arcakids.onboarding.welcome')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.welcomeText')}</Text>
        <Button onPress={() => setStep('location')}>
          {tr('arcakids.onboarding.start')}
        </Button>
      </SafeAreaView>
    );
  }

  if (step === 'location') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {renderStepHeading('arcakids.onboarding.locationTitle', 'arcakids.onboarding.locationStep')}
        <Text style={styles.description}>{tr('arcakids.onboarding.locationText')}</Text>
        <Text style={styles.list}>{tr('arcakids.onboarding.locationUses')}</Text>
        <Card>
          <Text style={styles.privacy}>{tr('arcakids.onboarding.locationPrivacy')}</Text>
        </Card>
        <Button
          onPress={() => {
            if (locationGranted === true) {
              setStep('usage');
              return;
            }
            void (async () => {
              await locationModule.requestPermission().catch(() => false);
              if (await locationModule.hasPermission()) {
                await locationModule.requestBackgroundPermission().catch(() => false);
              }
            })();
          }}
        >
          {locationGranted === true
            ? tr('arcakids.onboarding.adminDone')
            : tr('arcakids.onboarding.locationGrant')}
        </Button>
        <Pressable onPress={() => setStep('usage')}>
          <Text style={styles.back}>{tr('arcakids.onboarding.locationSkip')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'usage') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {renderStepHeading('arcakids.onboarding.usageTitle', 'arcakids.onboarding.usageStep')}
        <Text style={styles.description}>{tr('arcakids.onboarding.usageText')}</Text>
        <Text style={styles.list}>{tr('arcakids.onboarding.usageUses')}</Text>
        <Card>
          <Text style={styles.privacy}>{tr('arcakids.onboarding.usagePrivacy')}</Text>
        </Card>
        <Button
          onPress={() => {
            if (usageGranted === true) {
              setStep('overlay');
              return;
            }
            void parentalBridge.openUsageAccessSettings();
          }}
        >
          {usageGranted === true
            ? tr('arcakids.onboarding.adminDone')
            : tr('arcakids.onboarding.usageGrant')}
        </Button>
        <Pressable onPress={() => setStep('overlay')}>
          <Text style={styles.back}>{tr('arcakids.onboarding.usageSkip')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'overlay') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {renderStepHeading('arcakids.onboarding.overlayTitle', 'arcakids.onboarding.overlayStep')}
        <Text style={styles.description}>{tr('arcakids.onboarding.overlayText')}</Text>
        <Button
          onPress={() => {
            if (overlayGranted === true) {
              setStep('admin');
              return;
            }
            void deviceOwnerBridge.openOverlaySettings();
          }}
        >
          {overlayGranted === true
            ? tr('arcakids.onboarding.adminDone')
            : tr('arcakids.onboarding.overlayGrant')}
        </Button>
        <Pressable onPress={() => setStep('admin')}>
          <Text style={styles.back}>{tr('arcakids.onboarding.overlaySkip')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'admin') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        {renderStepHeading('arcakids.onboarding.adminTitle', 'arcakids.onboarding.adminStep')}
        <Text style={styles.description}>{tr('arcakids.onboarding.adminText')}</Text>
        <Text style={styles.list}>{tr('arcakids.onboarding.adminUses')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.adminNote')}</Text>
        <Button
          onPress={() => {
            if (adminGranted === true || isOwner === true) {
              setStep('done');
              return;
            }
            void deviceOwnerBridge.enableAdmin().catch(() => undefined);
          }}
        >
          {adminGranted === true || isOwner === true
            ? tr('arcakids.onboarding.adminDone')
            : tr('arcakids.onboarding.adminGrant')}
        </Button>
        <Pressable onPress={() => setStep('done')}>
          <Text style={styles.back}>{tr('arcakids.onboarding.adminDone')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'done') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.mascot}>🛡️</Text>
        <Text style={styles.title}>{tr('arcakids.onboarding.doneTitle')}</Text>
        <Text style={styles.description}>{tr('arcakids.onboarding.doneText')}</Text>
        <Button
          onPress={() => {
            void onboardingService.markCompleted().catch(() => undefined);
            router.replace(ROUTES.app);
          }}
        >
          {tr('arcakids.onboarding.doneFinish')}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
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
      <Pressable onPress={() => setStep('location')}>
        <Text style={styles.back}>{tr('arcakids.onboarding.back')}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </SafeAreaView>
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
  step: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
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
  list: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    lineHeight: 24,
  },
  privacy: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 20,
  },
  provisioning: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    textAlign: 'center',
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
