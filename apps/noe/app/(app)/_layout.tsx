import { useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, Stack } from 'expo-router';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius, useRandomVerse, VerseBanner, type ThemeColors } from '@noe-arcakids/shared';

import { useAuthStore } from '@/stores/auth-store';
import { ROUTES, SETUP_PENDING_KEY } from '@/constants';
import { pinService } from '@/features/pin/services/pin-service';
import { EduTipCard } from '@/features/family/components/edu-tip-card';
import { useContentMode } from '@/features/family/hooks/use-content-mode';
import { biometricService } from '@/features/security/services/biometric-service';
import { lockService } from '@/features/security/services/lock-service';
import { FirstSteps } from '@/features/onboarding/components/first-steps';
import { useSystemBackGuard } from '@/hooks/use-system-back';

const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;

export default function AppLayout() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const status = useAuthStore((state) => state.status);
  const insets = useSafeAreaInsets();
  const [lockOnOpen, setLockOnOpen] = useState<boolean | null>(null);
  const [setupPending, setSetupPending] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const pinVerse = useRandomVerse(['hope']);
  const { mode: contentMode, loaded: contentLoaded } = useContentMode();
  // Botón atrás del sistema: vuelve en la pila (Stack); doble-tap para salir en la raíz.
  useSystemBackGuard();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [lock, enabled] = await Promise.all([
          pinService.isLockOnOpenEnabled(),
          pinService.isEnabled(),
        ]);
        if (mounted) setLockOnOpen(lock && enabled);
      } catch {
        if (mounted) setLockOnOpen(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(SETUP_PENDING_KEY)
      .then((value) => {
        if (mounted) setSetupPending(value === 'true');
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const finishSetup = () => {
    setSetupPending(false);
    AsyncStorage.setItem(SETUP_PENDING_KEY, 'false').catch(() => {});
  };

  const backgroundAtRef = useRef<number | null>(null);
  const inactivityRef = useRef<number>(1);

  useEffect(() => {
    lockService
      .getInactivityMinutes()
      .then((minutes) => {
        inactivityRef.current = minutes;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        if (backgroundAtRef.current == null) backgroundAtRef.current = Date.now();
        return;
      }
      if (next === 'active' && backgroundAtRef.current != null) {
        const elapsed = Date.now() - backgroundAtRef.current;
        backgroundAtRef.current = null;
        const threshold = inactivityRef.current * 60_000;
        if (lockOnOpen && elapsed >= threshold) {
          setUnlocked(false);
          setPinInput('');
          setPinError(null);
        }
      }
    });
    return () => sub.remove();
  }, [lockOnOpen]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [enabled, supported] = await Promise.all([
          biometricService.isEnabled(),
          biometricService.isSupported(),
        ]);
        if (mounted) {
          setBioEnabled(enabled);
          setBioSupported(supported);
        }
      } catch {
        if (mounted) {
          setBioEnabled(false);
          setBioSupported(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'unauthenticated') {
    return <Redirect href={ROUTES.login} />;
  }

  if (status === 'initializing') {
    return null;
  }

  if (lockOnOpen && !unlocked) {
    return (
      <View style={[styles.pinGateWrap, { paddingTop: insets.top }]}>
        <MaterialIcons name="lock" size={48} color={colors.primary} />
        <Text style={styles.pinGateTitle}>NOE bloqueada</Text>
        <Text style={styles.pinGateSubtitle}>
          {bioSupported && bioEnabled ? 'Usa tu huella o ingresa tu PIN' : 'Ingresa tu PIN para abrir la app'}
        </Text>
        {bioSupported && bioEnabled ? (
          <Pressable
            style={styles.bioButton}
            onPress={async () => {
              const ok = await biometricService.authenticate('Desbloquear NOE');
              if (ok) setUnlocked(true);
            }}
          >
            <MaterialIcons name="fingerprint" size={28} color={colors.onPrimary} />
            <Text style={styles.bioButtonText}>Desbloquear con biometría</Text>
          </Pressable>
        ) : null}
        <TextInput
          style={styles.pinGateInput}
          value={pinInput}
          onChangeText={(text) => {
            const clean = text.replace(/\D/g, '').slice(0, PIN_MAX_LENGTH);
            setPinInput(clean);
            setPinError(null);
          }}
          keyboardType="number-pad"
          maxLength={PIN_MAX_LENGTH}
          secureTextEntry
          autoFocus
          placeholder="••••"
          placeholderTextColor={colors.textMuted}
        />
        {pinError ? <Text style={styles.pinGateError}>{pinError}</Text> : null}
        <Pressable
          style={[styles.bioButton, pinInput.length < PIN_MIN_LENGTH && styles.pinGateDisabled]}
          disabled={pinInput.length < PIN_MIN_LENGTH}
          onPress={async () => {
            const ok = await pinService.verifyPin(pinInput);
            if (ok) {
              setUnlocked(true);
            } else {
              setPinError('PIN incorrecto');
              setPinInput('');
            }
          }}
        >
          <Text style={styles.bioButtonText}>Desbloquear</Text>
        </Pressable>
        {contentLoaded && (contentMode === 'educativo' ? <EduTipCard /> : contentMode === 'cristiano' && pinVerse ? (
          <View style={styles.pinGateVerse}>
            <VerseBanner verse={pinVerse} title={tr('common.verseOfDay')} />
          </View>
        ) : null)}
      </View>
    );
  }

  if (setupPending) {
    return <FirstSteps onDone={finishSetup} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  pinGateWrap: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  pinGateTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  pinGateSubtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pinGateInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 24,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    backgroundColor: colors.background,
    width: 200,
    marginTop: spacing.sm,
  },
  pinGateError: {
    fontSize: typography.fontSizes.caption,
    color: colors.danger,
  },
  bioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  bioButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
  },
  pinGateDisabled: {
    opacity: 0.5,
  },
  pinGateVerse: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
