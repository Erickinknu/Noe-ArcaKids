import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { studyModeService, type StudySchedule } from '@/features/study-mode/services/study-mode-service';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

type StudyDay = { enabled: boolean; start: string; end: string };
type StudyScheduleState = Record<string, StudyDay>;

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
];

const BLOCKED_APPS = ['TikTok', 'Instagram', 'YouTube', 'Facebook', 'Snapchat', 'Discord', 'Twitch'];

const DEFAULT_STUDY: StudyScheduleState = {
  mon: { enabled: true, start: '08:00', end: '14:00' },
  tue: { enabled: true, start: '08:00', end: '14:00' },
  wed: { enabled: true, start: '08:00', end: '14:00' },
  thu: { enabled: true, start: '08:00', end: '14:00' },
  fri: { enabled: true, start: '08:00', end: '14:00' },
};

function toState(schedule: StudySchedule): StudyScheduleState {
  const state: StudyScheduleState = {};
  for (const day of DAYS) {
    const dayData = schedule.days.includes(day.key)
      ? { enabled: true, start: '08:00', end: '14:00' }
      : { enabled: false, start: '08:00', end: '14:00' };
    state[day.key] = dayData;
  }
  // Try to extract hours from first entry
  if (schedule.hours.length > 0) {
    for (const day of DAYS) {
      if (state[day.key].enabled) {
        state[day.key].start = schedule.hours[0].start;
        state[day.key].end = schedule.hours[0].end;
      }
    }
  }
  return state;
}

function fromState(enabled: boolean, state: StudyScheduleState): StudySchedule {
  const days: string[] = [];
  const hours: { start: string; end: string }[] = [];
  for (const day of DAYS) {
    if (state[day.key].enabled) {
      days.push(day.key);
      if (hours.length === 0) {
        hours.push({ start: state[day.key].start, end: state[day.key].end });
      }
    }
  }
  return { enabled, hours, days };
}

export default function ModoEstudioScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState<StudyScheduleState>(DEFAULT_STUDY);

  useEffect(() => {
    studyModeService
      .getSchedule()
      .then((s) => {
        setEnabled(s.enabled);
        if (s.days.length > 0) {
          setSchedule(toState(s));
        }
      })
      .catch((err) => setError(err?.message ?? 'Error al cargar'))
      .finally(() => setLoading(false));
  }, []);

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const studySchedule = fromState(enabled, schedule);
      await studyModeService.saveSchedule(studySchedule);
      Alert.alert('Guardado', 'Modo estudio actualizado correctamente');
    } catch (cause: any) {
      Alert.alert('Error', cause?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Cargando modo estudio..." />;
  if (error) return <ErrorState message={error} onRetry={() => setError(null)} />;

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Modo estudio</Text>
      </Pressable>
      <Text style={styles.description}>
        Cuando el modo estudio está activo, las apps de entretenimiento se bloquean automáticamente según el horario de clases.
      </Text>

      <Card>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Activar modo estudio</Text>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Horario de clases</Text>
      {DAYS.map((day) => {
        const ds = schedule[day.key];
        return (
          <Card key={day.key}>
            <View style={styles.dayRow}>
              <Text style={[styles.dayLabel, !ds.enabled && styles.dayDisabled]}>{day.label}</Text>
              <Switch
                value={ds.enabled}
                onValueChange={() => toggleDay(day.key)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            {ds.enabled && (
              <View style={styles.timeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Inicio</Text>
                  <Text style={styles.timeValue}>{ds.start}</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textMuted} />
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Fin</Text>
                  <Text style={styles.timeValue}>{ds.end}</Text>
                </View>
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.sectionLabel}>Apps bloqueadas en modo estudio</Text>
      <Card>
        {BLOCKED_APPS.map((app, i) => (
          <View key={app} style={[styles.appRow, i < BLOCKED_APPS.length - 1 && styles.appBorder]}>
            <Text style={styles.appName}>{app}</Text>
            <MaterialIcons name="block" size={18} color={colors.danger} />
          </View>
        ))}
      </Card>

      <Button onPress={handleSave} loading={saving}>
        Guardar modo estudio
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: typography.fontSizes.body, color: colors.text, flex: 1 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  dayDisabled: { color: colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  timeValue: { fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.primary },
  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  appBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  appName: { fontSize: typography.fontSizes.body, color: colors.text },
});
