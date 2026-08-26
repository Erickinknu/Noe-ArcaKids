import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@noe-arcakids/shared';

import { ThemeProvider } from '@/providers/theme-provider';
import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/constants';

const TAB_BAR_BASE_HEIGHT = 56;

export default function AppLayout() {
  const { t: tr } = useTranslation();
  const status = useAuthStore((state) => state.status);
  const insets = useSafeAreaInsets();

  if (status === 'unauthenticated') {
    return <Redirect href={ROUTES.login} />;
  }

  if (status === 'initializing') {
    return null;
  }

  return (
    <ThemeProvider>
      <Tabs
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
            <TabIcon name="family-restroom" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: tr('noe.tabs.control'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="shield" color={color} focused={focused} />
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
                color={focused ? '#FFFFFF' : color}
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
            <TabIcon name="bar-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Otros',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="more-horiz" color={color} focused={focused} />
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
    </ThemeProvider>
  );
}

function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  return (
    <MaterialIcons
      name={name as any}
      size={24}
      color={color}
      style={[styles.icon, focused && styles.iconActive]}
    />
  );
}

const styles = StyleSheet.create({
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
});
