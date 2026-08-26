import { useState } from 'react';
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

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

interface SettingToggle {
  key: string;
  title: string;
  subtitle: string;
  defaultValue: boolean;
}

const SETTINGS: SettingToggle[] = [
  {
    key: 'pushEnabled',
    title: 'Notificaciones push',
    subtitle: 'Recibe alertas en tu teléfono cuando algo importante ocurra',
    defaultValue: true,
  },
  {
    key: 'dailyReport',
    title: 'Reporte diario',
    subtitle: 'Resumen del uso diario de tus hijos a las 8:00 PM',
    defaultValue: true,
  },
  {
    key: 'bedtimeAlert',
    title: 'Alerta de hora de dormir',
    subtitle: 'Notificación cuando se acerca la hora de dormir del niño',
    defaultValue: false,
  },
  {
    key: 'appBlocked',
    title: 'App bloqueada / desbloqueada',
    subtitle: 'Aviso cuando cambias el estado de una app',
    defaultValue: true,
  },
  {
    key: 'timeLimitReached',
    title: 'Límite de tiempo alcanzado',
    subtitle: 'Alerta cuando el niño alcanza su límite diario',
    defaultValue: true,
  },
  {
    key: 'deviceOffline',
    title: 'Dispositivo desconectado',
    subtitle: 'Aviso cuando el teléfono del niño se desconecta',
    defaultValue: true,
  },
  {
    key: 'locationAlert',
    title: 'Alerta de ubicación',
    subtitle: 'Notificación cuando el niño sale de una zona segura',
    defaultValue: false,
  },
];

export default function NotificacionesAjustesScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(SETTINGS.map((s) => [s.key, s.defaultValue])),
  );

  function toggle(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
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
              value={settings[setting.key]}
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

const styles = StyleSheet.create({
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
