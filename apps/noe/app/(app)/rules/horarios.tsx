import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

type DaySchedule = { enabled: boolean; start: string; end: string };
type WeekSchedule = Record<string, DaySchedule>;

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

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

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
});
