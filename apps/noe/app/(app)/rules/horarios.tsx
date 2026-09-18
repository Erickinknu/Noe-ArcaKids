import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { TimeInput } from '@/components/ui/time-picker';
import { Card, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

type DaySchedule = { enabled: boolean; start: string; end: string };
type WeekSchedule = Record<string, DaySchedule>;

interface CustomSchedule {
  id: string;
  name: string;
  enabled: boolean;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

const DAYS = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: { enabled: true, start: '15:00', end: '19:00' },
  tue: { enabled: true, start: '15:00', end: '19:00' },
  wed: { enabled: true, start: '15:00', end: '19:00' },
  thu: { enabled: true, start: '15:00', end: '19:00' },
  fri: { enabled: true, start: '15:00', end: '20:00' },
  sat: { enabled: true, start: '10:00', end: '21:00' },
  sun: { enabled: true, start: '10:00', end: '19:00' },
};

export default function HorariosScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [customSchedules, setCustomSchedules] = useState<CustomSchedule[]>([]);

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  function addCustomSchedule() {
    setCustomSchedules((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: 'Nuevo horario',
        enabled: true,
        startH: 8,
        startM: 0,
        endH: 9,
        endM: 0,
      },
    ]);
  }

  function removeCustomSchedule(id: string) {
    setCustomSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function updateCustomSchedule(id: string, updates: Partial<CustomSchedule>) {
    setCustomSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Horarios de uso</Text>
      </Pressable>
      <Text style={styles.description}>
        Define los horarios en que tu hijo puede usar el dispositivo. Fuera de estos horarios, las apps se bloquearán automáticamente.
      </Text>

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
                  <Text style={styles.timeLabel}>Desde</Text>
                  <Text style={styles.timeValue}>{ds.start}</Text>
                </View>
                <MaterialIcons name="arrow-forward" size={18} color={colors.textMuted} />
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Hasta</Text>
                  <Text style={styles.timeValue}>{ds.end}</Text>
                </View>
              </View>
            )}
          </Card>
        );
      })}

      <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}>
        <Text style={styles.saveBtnText}>Guardar horarios</Text>
      </Pressable>

      {/* ── Horarios personalizados: única fuente de edición ── */}
      <View style={styles.customHeader}>
        <MaterialIcons name="event" size={22} color="#059669" />
        <View style={styles.customHeaderText}>
          <Text style={styles.customTitle}>Horarios personalizados</Text>
          <Text style={styles.customDescription}>Biblia, escuela, actividades, etc.</Text>
        </View>
      </View>

      <Card>
        {customSchedules.length === 0 ? (
          <Text style={styles.customEmpty}>Aún no hay horarios personalizados.</Text>
        ) : (
          customSchedules.map((sch, i) => (
            <View
              key={sch.id}
              style={[styles.customRow, i > 0 && styles.customRowBorder]}
            >
              <View style={styles.customTop}>
                <Pressable onPress={() => updateCustomSchedule(sch.id, { enabled: !sch.enabled })}>
                  <MaterialIcons
                    name={sch.enabled ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={sch.enabled ? '#059669' : colors.textMuted}
                  />
                </Pressable>
                <Text style={[styles.customName, !sch.enabled && { color: colors.textMuted }]}>
                  {sch.name}
                </Text>
                <Pressable
                  onPress={() => {
                    Alert.alert('Eliminar horario', `¿Eliminar "${sch.name}"?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Eliminar', style: 'destructive', onPress: () => removeCustomSchedule(sch.id) },
                    ]);
                  }}
                >
                  <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
              {sch.enabled && (
                <View style={styles.customTimes}>
                  <TimeInput
                    hours={sch.startH}
                    minutes={sch.startM}
                    onHoursChange={(h) => updateCustomSchedule(sch.id, { startH: h })}
                    onMinutesChange={(m) => updateCustomSchedule(sch.id, { startM: m })}
                    label="Inicio"
                  />
                  <MaterialIcons name="arrow-forward" size={18} color={colors.textMuted} />
                  <TimeInput
                    hours={sch.endH}
                    minutes={sch.endM}
                    onHoursChange={(h) => updateCustomSchedule(sch.id, { endH: h })}
                    onMinutesChange={(m) => updateCustomSchedule(sch.id, { endM: m })}
                    label="Fin"
                  />
                </View>
              )}
            </View>
          ))
        )}

        <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]} onPress={addCustomSchedule}>
          <MaterialIcons name="add-circle-outline" size={20} color="#059669" />
          <Text style={styles.addBtnText}>Agregar horario</Text>
        </Pressable>
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  dayDisabled: { color: colors.textMuted },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  timeValue: { fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.primary },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
  customHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  customHeaderText: { flex: 1, gap: 2 },
  customTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  customDescription: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  customEmpty: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  customRow: { marginTop: spacing.md },
  customRowBorder: { paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  customTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customName: { flex: 1, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  customTimes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: '#059669', borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  addBtnPressed: { backgroundColor: '#05966918' },
  addBtnText: { fontSize: typography.fontSizes.body, color: '#059669', fontWeight: typography.fontWeights.medium },
});
