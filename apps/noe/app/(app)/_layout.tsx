import { useEffect, useMemo, useState } from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, typography, spacing, radius, useRandomVerse, VerseBanner, type ThemeColors } from '@noe-arcakids/shared';

import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/constants';
import { pinService } from '@/features/pin/services/pin-service';
import { biometricService } from '@/features/security/services/biometric-service';

const TAB_BAR_BASE_HEIGHT = 56;
const PIN_LENGTH = 4;

export default function AppLayout() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const status = useAuthStore((state) => state.status);
  const insets = useSafeAreaInsets();
  const [lockOnOpen, setLockOnOpen] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioSupported, setBioSupported] = useState(false);
  const pinVerse = useRandomVerse(['hope']);

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
          onChangeText={async (text) => {
            const clean = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
            setPinInput(clean);
            setPinError(null);
            if (clean.length === PIN_LENGTH) {
              const ok = await pinService.verifyPin(clean);
              if (ok) {
                setUnlocked(true);
              } else {
                setPinError('PIN incorrecto');
                setPinInput('');
              }
            }
          }}
          keyboardType="number-pad"
          maxLength={PIN_LENGTH}
          secureTextEntry
          autoFocus
          placeholder="••••"
          placeholderTextColor={colors.textMuted}
        />
        {pinError ? <Text style={styles.pinGateError}>{pinError}</Text> : null}
        {pinVerse ? (
          <View style={styles.pinGateVerse}>
            <VerseBanner verse={pinVerse} title={tr('common.verseOfDay')} />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="index"
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
      tabBarLabelStyle: styles.tabBarLabel,
    }}
  >
      {/* ── Tab order: Hijos, Control, Inicio (center), Actividad, Otros ── */}
      <Tabs.Screen
        name="children"
        options={{
          title: tr('noe.tabs.children'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="family-restroom" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: tr('noe.tabs.control'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: tr('noe.tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.homeIconWrap, focused && styles.homeIconWrapActive]}>
              <MaterialIcons
                name="home"
                size={24}
                color={focused ? colors.onPrimary : color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: tr('noe.tabs.activity'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bar-chart" color={color} focused={focused} styles={styles} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Otros',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="more-horiz" color={color} focused={focused} styles={styles} />
          ),
        }}
      />

      <Tabs.Screen name="linking" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="children/[childId]" options={{ href: null }} />
      {/* Control sub-screens */}
      <Tabs.Screen name="rules/horarios" options={{ href: null }} />
      <Tabs.Screen name="rules/modo-estudio" options={{ href: null }} />
      <Tabs.Screen name="rules/geofencing" options={{ href: null }} />
      <Tabs.Screen name="rules/filtrado-web" options={{ href: null }} />
      <Tabs.Screen name="rules/apps" options={{ href: null }} />
      {/* Profile sub-screens */}
      <Tabs.Screen name="profile/familia" options={{ href: null }} />
      <Tabs.Screen name="profile/cuenta" options={{ href: null }} />
      <Tabs.Screen name="profile/notificaciones-ajustes" options={{ href: null }} />
      <Tabs.Screen name="profile/pin" options={{ href: null }} />
      <Tabs.Screen name="profile/config" options={{ href: null }} />
      <Tabs.Screen name="profile/ayuda" options={{ href: null }} />
      <Tabs.Screen name="profile/sugerir" options={{ href: null }} />
      <Tabs.Screen name="profile/compartir" options={{ href: null }} />
      <Tabs.Screen name="profile/privacidad" options={{ href: null }} />
      <Tabs.Screen name="profile/terminos" options={{ href: null }} />
      <Tabs.Screen name="profile/suscripcion" options={{ href: null }} />
      {/* Activity sub-screens */}
      <Tabs.Screen name="activity/web" options={{ href: null }} />
      <Tabs.Screen name="activity/youtube" options={{ href: null }} />
      <Tabs.Screen name="activity/apps" options={{ href: null }} />
      <Tabs.Screen name="activity/social" options={{ href: null }} />
      <Tabs.Screen name="activity/media" options={{ href: null }} />
      <Tabs.Screen name="activity/conversations" options={{ href: null }} />
      <Tabs.Screen name="activity/location" options={{ href: null }} />
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
  return (
    <MaterialIcons
      name={name as any}
      size={24}
      color={color}
      style={[styles.icon, focused && styles.iconActive]}
    />
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  tabBarLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
  },
  icon: {
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  homeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIconWrapActive: {
    backgroundColor: colors.primary,
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
  pinGateVerse: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});