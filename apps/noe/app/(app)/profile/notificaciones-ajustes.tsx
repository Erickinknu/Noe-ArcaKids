import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { notificationPreferencesService } from '@/features/notifications/services/notification-preferences-service';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/features/notifications/repositories/notification-preferences-repository';
import { Card, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface SettingToggle {
  key: keyof NotificationPreferences;
  title: string;
  subtitle: string;
}

const SETTINGS: SettingToggle[] = [
  {
    key: 'pushEnabled',
    title: 'Notificaciones push',
    subtitle: 'Recibe alertas en tu teléfono cuando algo importante ocurra',
  },
  {
    key: 'dailyReport',
    title: 'Reporte diario',
    subtitle: 'Resumen del uso diario de tus hijos a las 8:00 PM',
  },
  {
    key: 'bedtimeAlert',
    title: 'Alerta de hora de dormir',
    subtitle: 'Notificación cuando se acerca la hora de dormir del niño',
  },
  {
    key: 'appBlocked',
    title: 'App bloqueada / desbloqueada',
    subtitle: 'Aviso cuando cambias el estado de una app',
  },
  {
    key: 'timeLimitReached',
    title: 'Límite de tiempo alcanzado',
    subtitle: 'Alerta cuando el niño alcanza su límite diario',
  },
  {
    key: 'deviceOffline',
    title: 'Dispositivo desconectado',
    subtitle: 'Aviso cuando el teléfono del niño se desconecta',
  },
  {
    key: 'locationAlert',
    title: 'Alerta de ubicación',
    subtitle: 'Notificación cuando el niño sale de una zona segura',
  },
];

export default function NotificacionesAjustesScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  useEffect(() => {
    let mounted = true;
    notificationPreferencesService
      .getPreferences()
      .then((p) => {
        if (mounted) setPrefs(p);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  function toggle(key: keyof NotificationPreferences) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      notificationPreferencesService
        .updatePreferences({ [key]: next[key] as boolean })
        .catch(() => {});
      return next;
    });
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Notificaciones</Text>
      </Pressable>

      <Text style={styles.subtitle}>
        Configura cómo y cuándo recibir notificaciones de las actividades de tus hijos.
      </Text>

      <Card>
        {SETTINGS.map((setting, i) => (
          <View
            key={setting.key}
            style={[styles.row, i < SETTINGS.length - 1 && styles.rowBorder]}
          >
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{setting.title}</Text>
              <Text style={styles.rowSubtitle}>{setting.subtitle}</Text>
            </View>
            <Switch
              value={prefs[setting.key]}
              onValueChange={() => toggle(setting.key)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowContent: {
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
});