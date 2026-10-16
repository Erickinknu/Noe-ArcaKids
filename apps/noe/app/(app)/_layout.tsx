import { useEffect, useMemo, useRef, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { AppState, Pressable, StyleSheet, Text, TextInput, View, type ColorValue } from 'react-native';
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
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-notifications';
import { unlockRequestService } from '@/features/unlock-request/services/unlock-request-service';
import { useSystemBackGuard } from '@/hooks/use-system-back';

const TAB_BAR_BASE_HEIGHT = 54;
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
  // Botón atrás del sistema: vuelve en la pila, doble-tap para salir en raíz.
  useSystemBackGuard();
  const unreadCount = useUnreadNotificationCount();
  const [pendingUnlockCount, setPendingUnlockCount] = useState(0);

  // Novedades de Actividad = notificaciones sin leer O solicitudes de desbloqueo pendientes.
  // Suscripción barata: una carga al montar + realtime, sin polling.
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;
    (async () => {
      try {
        const requests = await unlockRequestService.getPendingRequests();
        if (mounted) setPendingUnlockCount(requests.length);
      } catch {
        /* sin novedades si falla la carga */
      }
      try {
        unsubscribe = unlockRequestService.subscribeToPendingRequests((requests) => {
          if (mounted) setPendingUnlockCount(requests.length);
        });
      } catch {
        /* sin suscripción si falla el canal */
      }
    })();
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const hasActivityNews = unreadCount > 0 || pendingUnlockCount > 0;

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

  return (
    <Tabs
      initialRouteName="index"
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.borderLight,
          borderTopWidth: 1,
          height: TAB_BAR_BASE_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: spacing.xs,
        },
        tabBarLabel: ({ focused, color, children }) =>
          focused ? null : (
            <Text style={[styles.tabBarLabel, { color }]}>{children}</Text>
          ),
      }}
    >
      {/* ── Tab order: Hijos, Control, Inicio (center), Actividad, Otros ── */}
      <Tabs.Screen
        name="children"
        options={{
          title: tr('noe.tabs.children'),
          tabBarAccessibilityLabel: tr('noe.tabs.children'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="family-restroom" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: tr('noe.tabs.control'),
          tabBarAccessibilityLabel: tr('noe.tabs.control'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: tr('noe.tabs.home'),
          tabBarAccessibilityLabel: tr('noe.tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: tr('noe.tabs.activity'),
          tabBarAccessibilityLabel: tr('noe.tabs.activity'),
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.tabIconWrap}>
              <TabIcon name="bar-chart" color={color} focused={focused} styles={styles} />
              {hasActivityNews ? <View style={styles.activityDot} /> : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Otros',
          tabBarAccessibilityLabel: 'Otros',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="more-horiz" color={color} focused={focused} styles={styles} />
          ),
        }}
      />

      <Tabs.Screen name="linking" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="children/[childId]" options={{ href: null }} />
      <Tabs.Screen name="children/[childId]/devices" options={{ href: null }} />
      {/* Control sub-screens */}
      <Tabs.Screen name="rules/modo-estudio" options={{ href: null }} />
      <Tabs.Screen name="rules/filtrado-web" options={{ href: null }} />
      <Tabs.Screen name="rules/apps" options={{ href: null }} />
      {/* Profile sub-screens */}
      <Tabs.Screen name="profile/familia" options={{ href: null }} />
      <Tabs.Screen name="profile/cuenta" options={{ href: null }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null }} />
      <Tabs.Screen name="profile/pin" options={{ href: null }} />
      <Tabs.Screen name="profile/seguridad" options={{ href: null }} />
      <Tabs.Screen name="profile/unirme" options={{ href: null }} />
      <Tabs.Screen name="profile/config" options={{ href: null }} />
      <Tabs.Screen name="profile/ayuda" options={{ href: null }} />
      <Tabs.Screen name="profile/sugerir" options={{ href: null }} />
      <Tabs.Screen name="profile/compartir" options={{ href: null }} />
      <Tabs.Screen name="profile/privacidad" options={{ href: null }} />
      <Tabs.Screen name="profile/terminos" options={{ href: null }} />
      <Tabs.Screen name="profile/suscripcion" options={{ href: null }} />
      <Tabs.Screen name="profile/deuna" options={{ href: null }} />
      {/* Activity sub-screens */}
      <Tabs.Screen name="activity/web" options={{ href: null }} />
      <Tabs.Screen name="activity/youtube" options={{ href: null }} />
      <Tabs.Screen name="activity/apps" options={{ href: null }} />
      <Tabs.Screen name="activity/social" options={{ href: null }} />
      <Tabs.Screen name="activity/media" options={{ href: null }} />
      <Tabs.Screen name="activity/conversations" options={{ href: null }} />
      <Tabs.Screen name="activity/sitios" options={{ href: null }} />
      <Tabs.Screen name="activity/alertas" options={{ href: null }} />
      <Tabs.Screen name="location/index" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  focused,
  styles,
}: {
  name: string;
  color: ColorValue;
  focused: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  if (focused) {
    return (
      <View style={styles.tabIconActive}>
        <MaterialIcons name={name as any} size={24} color={color} />
      </View>
    );
  }
  return <MaterialIcons name={name as any} size={22} color={color} />;
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeights.semibold,
  },
  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
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