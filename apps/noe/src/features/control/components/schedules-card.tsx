import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { TimeInput } from '@/components/ui/time-picker';
import { Card, radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface BedtimeParts {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

interface SchedulesCardProps {
  masterOn: boolean;
  studyEnabled: boolean;
  bedtimeOn: boolean;
  bedtime: BedtimeParts;
  saving: boolean;
  onToggleMaster: (value: boolean) => void;
  onToggleBedtime: (value: boolean) => void;
  onBedtimeTime: (field: keyof BedtimeParts, value: number) => void;
  onSaveBedtime: () => void;
  onOpenStudy: () => void;
}

export function SchedulesCard({
  masterOn,
  studyEnabled,
  bedtimeOn,
  bedtime,
  saving,
  onToggleMaster,
  onToggleBedtime,
  onBedtimeTime,
  onSaveBedtime,
  onOpenStudy,
}: SchedulesCardProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <MaterialIcons name="schedule" size={22} color={colors.primary} />
        </View>
        <Text style={styles.title}>{tr('noe.control.schedules')}</Text>
        <Switch
          accessibilityLabel={tr('noe.control.masterOn')}
          value={masterOn}
          onValueChange={onToggleMaster}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.navRow, pressed && styles.navRowPressed]}
        onPress={onOpenStudy}
      >
        <View style={[styles.dot, { backgroundColor: studyEnabled ? colors.success : colors.border }]} />
        <Text style={styles.navTitle}>{tr('noe.control.study')}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
      </Pressable>

      {/* Descanso (bedtime) se edita inline aquí. */}
      <View style={styles.bedtimeRow}>
        <Text style={styles.bedtimeLabel}>{tr('noe.control.rest')}</Text>
        <Switch
          value={bedtimeOn}
          onValueChange={onToggleBedtime}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
      {bedtimeOn ? (
        <View style={styles.bedtimeEditor}>
          <TimeInput
            hours={bedtime.startH}
            minutes={bedtime.startM}
            onHoursChange={(h) => onBedtimeTime('startH', h)}
            onMinutesChange={(m) => onBedtimeTime('startM', m)}
            label=""
          />
          <TimeInput
            hours={bedtime.endH}
            minutes={bedtime.endM}
            onHoursChange={(h) => onBedtimeTime('endH', h)}
            onMinutesChange={(m) => onBedtimeTime('endM', m)}
            label=""
          />
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={onSaveBedtime}
            disabled={saving}
          >
            <Text style={styles.saveText}>{tr('noe.control.done')}</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    card: { gap: spacing.sm, ...shadows.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    navRowPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    dot: { width: 10, height: 10, borderRadius: 5 },
    navTitle: {
      flex: 1,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    navDetail: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      maxWidth: 150,
    },
    bedtimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    bedtimeLabel: { fontSize: typography.fontSizes.body, color: colors.text },
    bedtimeEditor: { gap: spacing.md, alignItems: 'center' },
    saveBtn: {
      width: '100%',
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    saveBtnPressed: { opacity: 0.85 },
    saveText: {
      color: colors.onPrimary,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
    },
  });
