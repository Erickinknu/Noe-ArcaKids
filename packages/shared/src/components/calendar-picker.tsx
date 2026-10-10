import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme-context';
import { radius, spacing, typography, type ThemeColors } from '../theme';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEK_ES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const WEEK_EN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

interface CalendarPickerProps {
  visible: boolean;
  value?: string | null;
  minDate?: Date;
  maxDate?: Date;
  locale?: 'es' | 'en';
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onSelect: (isoDate: string) => void;
  onClose: () => void;
}

/** Selector de fecha con calendario mensual (sin dependencias nativas). */
export function CalendarPicker({
  visible,
  value,
  minDate,
  maxDate,
  locale = 'es',
  title,
  confirmLabel,
  cancelLabel,
  onSelect,
  onClose,
}: CalendarPickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const months = locale === 'es' ? MONTHS_ES : MONTHS_EN;
  const week = locale === 'es' ? WEEK_ES : WEEK_EN;

  const initial = parseISODate(value ?? null) ?? maxDate ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [picked, setPicked] = useState<Date | null>(parseISODate(value ?? null));

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const days = new Date(viewYear, viewMonth + 1, 0).getDate();
    const out: Array<{ day: number | null; date: Date | null }> = [];
    for (let i = 0; i < first; i += 1) out.push({ day: null, date: null });
    for (let d = 1; d <= days; d += 1) out.push({ day: d, date: new Date(viewYear, viewMonth, d) });
    return out;
  }, [viewYear, viewMonth]);

  const inRange = (d: Date) => {
    if (minDate && d < startOfDay(minDate)) return false;
    if (maxDate && d > startOfDay(maxDate)) return false;
    return true;
  };

  const go = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title ?? (locale === 'es' ? 'Selecciona la fecha' : 'Pick a date')}</Text>
          <View style={styles.navRow}>
            <Pressable style={styles.navBtn} onPress={() => go(-1)}>
              <Text style={styles.navTxt}>‹</Text>
            </Pressable>
            <Text style={styles.monthTxt}>
              {months[viewMonth]} {viewYear}
            </Text>
            <Pressable style={styles.navBtn} onPress={() => go(1)}>
              <Text style={styles.navTxt}>›</Text>
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {week.map((w, i) => (
              <Text key={`${w}-${i}`} style={styles.weekTxt}>
                {w}
              </Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((c, i) => {
              if (c.day == null || !c.date) return <View key={`e${i}`} style={styles.cell} />;
              const ok = inRange(c.date);
              const active =
                picked &&
                picked.getFullYear() === c.date.getFullYear() &&
                picked.getMonth() === c.date.getMonth() &&
                picked.getDate() === c.date.getDate();
              return (
                <Pressable
                  key={`d${i}`}
                  style={[styles.cell, active && styles.cellActive, !ok && styles.cellDisabled]}
                  disabled={!ok}
                  onPress={() => setPicked(c.date)}
                >
                  <Text style={[styles.cellTxt, active && styles.cellTxtActive, !ok && styles.cellTxtDisabled]}>
                    {c.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelTxt}>{cancelLabel ?? (locale === 'es' ? 'Cancelar' : 'Cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.okBtn, !picked && styles.okBtnDisabled]}
              disabled={!picked}
              onPress={() => {
                if (picked) onSelect(formatISODate(picked));
                onClose();
              }}
            >
              <Text style={styles.okTxt}>{confirmLabel ?? (locale === 'es' ? 'Confirmar' : 'Confirm')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
    },
    title: {
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    navBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navTxt: { fontSize: 22, color: colors.primary, fontWeight: typography.fontWeights.bold },
    monthTxt: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekTxt: {
      flex: 1,
      textAlign: 'center',
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textMuted,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: '14.28%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.full,
    },
    cellActive: { backgroundColor: colors.primary },
    cellDisabled: { opacity: 0.3 },
    cellTxt: { fontSize: typography.fontSizes.body, color: colors.text },
    cellTxtActive: { color: colors.onPrimary, fontWeight: typography.fontWeights.bold },
    cellTxtDisabled: { color: colors.textMuted },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    cancelTxt: { color: colors.textSecondary, fontWeight: typography.fontWeights.semibold },
    okBtn: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    okBtnDisabled: { opacity: 0.5 },
    okTxt: { color: colors.onPrimary, fontWeight: typography.fontWeights.bold },
  });
