import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { Avatar } from '@/components/ui/avatar';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import {
  studyModeService,
  DEFAULT_BLOCKED_PACKAGES,
  type StudySchedule,
  type StudyWeekday,
} from '@/features/study-mode/services/study-mode-service';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { Card, useTheme, useAsyncData, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';
import type { ChildProfile } from '@noe-arcakids/types';

type StudyDay = { enabled: boolean; start: string; end: string };
type StudyScheduleState = Partial<Record<StudyWeekday, StudyDay>>;

const DAYS: { key: StudyWeekday; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
];

// These must stay in sync with the package names the child device actually
// blocks. Previously this list was display-only decoration and the persisted
// packages were ignored entirely.
const BLOCKABLE_APPS: { packageName: string; label: string }[] = [
  { packageName: 'com.zhiliaoapp.musically', label: 'TikTok' },
  { packageName: 'com.instagram.android', label: 'Instagram' },
  { packageName: 'com.google.android.youtube', label: 'YouTube' },
  { packageName: 'com.facebook.katana', label: 'Facebook' },
  { packageName: 'com.snapchat.android', label: 'Snapchat' },
  { packageName: 'com.discord', label: 'Discord' },
  { packageName: 'com.twitch.android.app', label: 'Twitch' },
];

const DEFAULT_STUDY: StudyScheduleState = {
  mon: { enabled: true, start: '08:00', end: '14:00' },
  tue: { enabled: true, start: '08:00', end: '14:00' },
  wed: { enabled: true, start: '08:00', end: '14:00' },
  thu: { enabled: true, start: '08:00', end: '14:00' },
  fri: { enabled: true, start: '08:00', end: '14:00' },
};

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function fromMinutes(total: number): string {
  const clamped = ((Math.round(total) % 1440) + 1440) % 1440;
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function toState(schedule: StudySchedule): StudyScheduleState {
  const state: StudyScheduleState = {};
  for (const day of DAYS) {
    const window = schedule.hours[day.key];
    state[day.key] = {
      enabled: schedule.days.includes(day.key as StudyWeekday),
      start: window?.start ?? '08:00',
      end: window?.end ?? '14:00',
    };
  }
  return state;
}

function fromState(
  enabled: boolean,
  state: StudyScheduleState,
  blockedPackages: string[]
): StudySchedule {
  const days: StudyWeekday[] = [];
  const hours: Partial<Record<StudyWeekday, { start: string; end: string }>> = {};
  for (const day of DAYS) {
    const key = day.key;
    const entry = state[key];
    if (!entry?.enabled) continue;
    days.push(key);
    hours[key] = { start: entry.start, end: entry.end };
  }
  return { enabled, days, hours, blockedPackages };
}

export default function ModoEstudioScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState<StudyScheduleState>(DEFAULT_STUDY);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [blockedPackages, setBlockedPackages] = useState<string[]>(DEFAULT_BLOCKED_PACKAGES);
  const [timeEditor, setTimeEditor] = useState<{ day: StudyWeekday; field: 'start' | 'end' } | null>(null);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, loading: childrenLoading } = useAsyncData(fetchChildren);

  const activeChildId = selectedChildId ?? children?.[0]?.id ?? null;

  useEffect(() => {
    if (!activeChildId) return;
    studyModeService
      .getSchedule(activeChildId)
      .then((s) => {
        setEnabled(s.enabled);
        if (s.days.length > 0) {
          setSchedule(toState(s));
        }
        setBlockedPackages(s.blockedPackages ?? DEFAULT_BLOCKED_PACKAGES);
      })
      .catch((err) => setError(err?.message ?? 'Error al cargar'))
      .finally(() => setLoading(false));
  }, [activeChildId]);

  const toggleDay = (day: StudyWeekday) => {
    setSchedule((prev) => {
      const entry = prev[day];
      if (!entry) return prev;
      return { ...prev, [day]: { ...entry, enabled: !entry.enabled } };
    });
  };

  const toggleApp = (packageName: string) => {
    setBlockedPackages((prev) =>
      prev.includes(packageName)
        ? prev.filter((p) => p !== packageName)
        : [...prev, packageName]
    );
  };

  const shiftTime = (day: StudyWeekday, field: 'start' | 'end', deltaMinutes: number) => {
    setSchedule((prev) => {
      const entry = prev[day];
      if (!entry) return prev;
      const current = toMinutes(entry[field]);
      if (current === null) return prev;
      return {
        ...prev,
        [day]: { ...entry, [field]: fromMinutes(current + deltaMinutes) },
      };
    });
  };

  const setTime = (day: StudyWeekday, field: 'start' | 'end', value: string) => {
    setSchedule((prev) => {
      const entry = prev[day];
      if (!entry) return prev;
      return { ...prev, [day]: { ...entry, [field]: value } };
    });
  };

  const handleSave = async () => {
    if (!activeChildId) return;
    const invalid = Object.values(schedule).find(
      (day) => day.enabled && (toMinutes(day.start) === null || toMinutes(day.end) === null)
    );
    if (invalid) {
      Alert.alert('Horario inválido', 'Revisa las horas: usa el formato HH:MM (00:00 a 23:59).');
      return;
    }
    setSaving(true);
    try {
      const studySchedule = fromState(enabled, schedule, blockedPackages);
      await studyModeService.saveSchedule(studySchedule, activeChildId);
      Alert.alert('Guardado', 'Modo estudio actualizado correctamente');
    } catch (cause: any) {
      Alert.alert('Error', cause?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading || childrenLoading) return <LoadingState text="Cargando modo estudio..." />;
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

      {/* Child selector */}
      {(children ?? []).length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Selecciona un hijo</Text>
          {(children ?? []).map((child: ChildProfile) => (
            <Pressable
              key={child.id}
              style={({ pressed }) => [styles.childRow, pressed && styles.childRowPressed,
                activeChildId === child.id && styles.childRowActive]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={32} />
              <Text style={[styles.childName, activeChildId === child.id && styles.childNameActive]}>
                {child.displayName}
              </Text>
              {activeChildId === child.id && (
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </Card>
      )}

      <Card style={styles.card}>
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
        if (!ds) return null;
        return (
          <Card key={day.key} style={styles.card}>
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
                <Pressable
                  style={styles.timeBox}
                  onPress={() => setTimeEditor({ day: day.key, field: 'start' })}
                >
                  <Text style={styles.timeLabel}>Inicio</Text>
                  <Text style={styles.timeValue}>{ds.start}</Text>
                </Pressable>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textMuted} />
                <Pressable
                  style={styles.timeBox}
                  onPress={() => setTimeEditor({ day: day.key, field: 'end' })}
                >
                  <Text style={styles.timeLabel}>Fin</Text>
                  <Text style={styles.timeValue}>{ds.end}</Text>
                </Pressable>
              </View>
            )}
          </Card>
        );
      })}

      <Text style={styles.sectionLabel}>Apps bloqueadas en modo estudio</Text>
      <Card style={styles.card}>
        {BLOCKABLE_APPS.map((app, i) => {
          const active = blockedPackages.includes(app.packageName);
          return (
            <Pressable
              key={app.packageName}
              onPress={() => toggleApp(app.packageName)}
              style={({ pressed }) => [
                styles.appRow,
                i < BLOCKABLE_APPS.length - 1 && styles.appBorder,
                pressed && styles.appRowPressed,
              ]}
            >
              <View>
                <Text style={[styles.appName, !active && styles.appNameOff]}>{app.label}</Text>
                <Text style={styles.appPackage}>{app.packageName}</Text>
              </View>
              <MaterialIcons
                name={active ? 'block' : 'check-circle-outline'}
                size={18}
                color={active ? colors.danger : colors.textMuted}
              />
            </Pressable>
          );
        })}
        <Text style={styles.appHint}>
          Toca una app para alternar su bloqueo durante el horario de clases.
        </Text>
      </Card>

      <Button onPress={handleSave} loading={saving}>
        Guardar modo estudio
      </Button>

      <Modal
        visible={timeEditor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeEditor(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {timeEditor?.field === 'start' ? 'Hora de inicio' : 'Hora de fin'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {DAYS.find((d) => d.key === timeEditor?.day)?.label}
            </Text>

            {timeEditor && schedule[timeEditor.day] && (
              <>
                <View style={styles.modalSteppers}>
                  <Pressable
                    style={styles.modalStepBtn}
                    onPress={() => shiftTime(timeEditor.day, timeEditor.field, -60)}
                  >
                    <MaterialIcons name="remove" size={18} color={colors.primary} />
                    <Text style={styles.modalStepLabel}>1h</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalStepBtn}
                    onPress={() => shiftTime(timeEditor.day, timeEditor.field, -15)}
                  >
                    <MaterialIcons name="remove" size={18} color={colors.primary} />
                    <Text style={styles.modalStepLabel}>15m</Text>
                  </Pressable>
                  <Text style={styles.modalValue}>{schedule[timeEditor.day]?.[timeEditor.field]}</Text>
                  <Pressable
                    style={styles.modalStepBtn}
                    onPress={() => shiftTime(timeEditor.day, timeEditor.field, 15)}
                  >
                    <MaterialIcons name="add" size={18} color={colors.primary} />
                    <Text style={styles.modalStepLabel}>15m</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalStepBtn}
                    onPress={() => shiftTime(timeEditor.day, timeEditor.field, 60)}
                  >
                    <MaterialIcons name="add" size={18} color={colors.primary} />
                    <Text style={styles.modalStepLabel}>1h</Text>
                  </Pressable>
                </View>

                <View style={styles.modalInputRow}>
                  <MaterialIcons name="edit" size={16} color={colors.textMuted} />
                  <TextInput
                    style={styles.modalInput}
                    value={schedule[timeEditor.day]?.[timeEditor.field] ?? ''}
                    onChangeText={(text) => setTime(timeEditor.day, timeEditor.field, text)}
                    placeholder="HH:MM"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>

                <Pressable
                  style={styles.modalConfirm}
                  onPress={() => setTimeEditor(null)}
                >
                  <Text style={styles.modalConfirmText}>Listo</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  card: { ...shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm, marginBottom: spacing.xs },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: typography.fontSizes.body, color: colors.text, flex: 1 },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  childRowPressed: { opacity: 0.7 },
  childRowActive: { backgroundColor: colors.primaryLight },
  childName: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
  childNameActive: { color: colors.primary, fontWeight: typography.fontWeights.semibold },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  dayDisabled: { color: colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  timeValue: { fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.primary },
  appRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  appRowPressed: { opacity: 0.6 },
  appBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  appName: { fontSize: typography.fontSizes.body, color: colors.text },
  appNameOff: { color: colors.textMuted },
  appPackage: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  appHint: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: spacing.sm },

  // Time editor modal (mirrors the limit modal in rules/apps.tsx)
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  modalSubtitle: { fontSize: typography.fontSizes.body, color: colors.textMuted },
  modalSteppers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  modalStepBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 44, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  modalStepLabel: { fontSize: typography.fontSizes.caption, color: colors.primary, fontWeight: typography.fontWeights.medium },
  modalValue: { minWidth: 84, textAlign: 'center', fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.text },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.background },
  modalInput: { flex: 1, textAlign: 'center', paddingVertical: spacing.xs, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  modalConfirm: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  modalConfirmText: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.onPrimary },
});
