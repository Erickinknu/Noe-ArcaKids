import { StyleSheet, type ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing } from '@noe-arcakids/shared';

import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/constants';

export default function AppLayout() {
  const { t: tr } = useTranslation();
  const status = useAuthStore((state) => state.status);

  if (status === 'unauthenticated') {
    return <Redirect href={ROUTES.login} />;
  }

  // During init the native splash is visible; return null to avoid
  // flashing protected Tabs before auth resolves.
  if (status === 'initializing') {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr('noe.tabs.home'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
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
        name="activity"
        options={{
          title: tr('noe.tabs.activity'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bar-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="linking"
        options={{
          title: tr('noe.tabs.linking'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="link" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr('noe.tabs.settings'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tr('noe.tabs.profile'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: tr('noe.tabs.notifications'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="notifications" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
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
  tabBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.borderLight,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
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
});
