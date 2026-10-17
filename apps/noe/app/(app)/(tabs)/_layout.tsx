import { useEffect, useMemo, useState } from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme, typography, spacing, type ThemeColors } from '@noe-arcakids/shared';

import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-notifications';
import { unlockRequestService } from '@/features/unlock-request/services/unlock-request-service';

const TAB_BAR_BASE_HEIGHT = 54;

export default function TabsLayout() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
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
  });
