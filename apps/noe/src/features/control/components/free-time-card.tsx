import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { ProgressBar } from '@/components/ui/progress-bar';
import { formatDuration } from '@/features/dashboard/services/dashboard-service';
import { Card, radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

import type { TopFreeTime } from './control-types';

interface FreeTimeCardProps {
  data: TopFreeTime | null;
  childName: string;
  savingLimit: boolean;
  onOpenMore: () => void;
  onEditLimit: (minutes: number) => void;
  onBlockNow: () => void;
}

export function FreeTimeCard({ data, childName, savingLimit, onOpenMore, onEditLimit, onBlockNow }: FreeTimeCardProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [editVisible, setEditVisible] = useState(false);
  const [minutesText, setMinutesText] = useState('');

  const top = data?.top.slice(0, 3) ?? [];
  const restCount = data?.restCount ?? 0;
  const usedMinutes = data?.usedMinutes ?? 0;
  const totalLimit = data?.totalLimit ?? null;

  function openEdit() {
    setMinutesText(totalLimit != null ? String(totalLimit) : '');
    setEditVisible(true);
  }

  function handleSaveLimit() {
    const parsed = parseInt(minutesText, 10);
    if (Number.isNaN(parsed)) return;
    const minutes = Math.min(1440, Math.max(1, Math.round(parsed)));
    setEditVisible(false);
    onEditLimit(minutes);
  }

  function handleBlockPress() {
    Alert.alert(tr('noe.control.blockNowTitle'), tr('noe.control.blockNowMsg', { name: childName }), [
      { text: tr('common.cancel'), style: 'cancel' },
      { text: tr('noe.control.confirmBlock'), style: 'destructive', onPress: onBlockNow },
    ]);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <MaterialIcons name="timer" size={22} color={colors.primary} />
        </View>
        <Text style={styles.title}>{tr('noe.control.freeTime')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('noe.control.edit')}
          style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
          onPress={openEdit}
        >
          <MaterialIcons name="edit" size={18} color={colors.primary} />
          <Text style={styles.editText}>{tr('noe.control.edit')}</Text>
        </Pressable>
      </View>

      {totalLimit != null ? (
        <View style={styles.usage}>
          <Text style={styles.usageText}>
            {tr('noe.control.usedOf', { used: formatDuration(usedMinutes), total: formatDuration(totalLimit) })}
          </Text>
          <ProgressBar value={usedMinutes} max={totalLimit} height={7} />
        </View>
      ) : (
        <Text style={styles.noLimit}>{tr('noe.control.noLimit')}</Text>
      )}

      {top.length > 0 ? (
        <View style={styles.topList}>
          <Text style={styles.sectionLabel}>{tr('noe.control.topApps')}</Text>
          {top.map((app) => (
            <View key={app.packageName} style={styles.appRow}>
              <MaterialIcons name="apps" size={18} color={colors.textMuted} />
              <Text style={styles.appLabel} numberOfLines={1}>
                {app.appLabel}
              </Text>
              <Text style={styles.appMinutes}>{formatDuration(app.minutes)}</Text>
            </View>
          ))}
          {restCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.moreBtn, pressed && styles.btnPressed]}
              onPress={onOpenMore}
            >
              <Text style={styles.moreText}>{tr('noe.control.moreApps', { n: restCount })}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.blockBtn, pressed && styles.btnPressed]}
        onPress={handleBlockPress}
      >
        <MaterialIcons name="block" size={18} color={colors.danger} />
        <Text style={styles.blockText}>{tr('noe.control.blockNow')}</Text>
      </Pressable>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{tr('noe.control.editLimitTitle')}</Text>
            <Text style={styles.modalHint}>{tr('noe.control.minutesHint')}</Text>
            <View style={styles.limitInputRow}>
              <MaterialIcons name="timer" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.limitInput}
                value={minutesText}
                onChangeText={setMinutesText}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="120"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
                onPress={() => setEditVisible(false)}
              >
                <Text style={styles.cancelText}>{tr('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}
                onPress={handleSaveLimit}
                disabled={savingLimit}
              >
                <Text style={styles.saveText}>{tr('noe.control.saveLimit')}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    card: { gap: spacing.md, ...shadows.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.primaryLight,
    },
    editText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
    },
    btnPressed: { opacity: 0.7 },
    usage: { gap: spacing.xs },
    usageText: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
    },
    noLimit: { fontSize: typography.fontSizes.body, color: colors.textMuted },
    topList: { gap: spacing.xs },
    sectionLabel: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    appLabel: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
    appMinutes: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textMuted,
    },
    moreBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    moreText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.primary,
    },
    blockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.dangerLight,
    },
    blockText: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.danger,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
      gap: spacing.md,
    },
    modalTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    modalHint: { fontSize: typography.fontSizes.caption, color: colors.textMuted, textAlign: 'center' },
    limitInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surface,
    },
    limitInput: {
      flex: 1,
      textAlign: 'center',
      paddingVertical: spacing.xs,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    modalActions: { flexDirection: 'row', gap: spacing.sm },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelText: { color: colors.text, fontWeight: typography.fontWeights.semibold },
    saveBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    saveText: { color: colors.onPrimary, fontWeight: typography.fontWeights.semibold },
  });
