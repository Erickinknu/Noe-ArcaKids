import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { ROUTES } from '@/constants';
import { relativeTime } from '@/features/dashboard/services/dashboard-service';
import type { ChildProfile } from '@noe-arcakids/types';
import { Card, radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

import type { ChildHeader } from './control-types';

interface ChildSelectorProps {
  childList: ChildProfile[];
  selectedId: string | null;
  onSelect: (childId: string) => void;
  header: ChildHeader | null;
}

function ringerMeta(ringerMode: NonNullable<ChildHeader['ringerMode']>): { icon: string; key: string } {
  if (ringerMode === 'vibrate') return { icon: 'vibration', key: 'noe.control.soundVibrate' };
  if (ringerMode === 'silent') return { icon: 'volume-off', key: 'noe.control.soundSilent' };
  return { icon: 'volume-up', key: 'noe.control.soundNormal' };
}

export function ChildSelector({ childList, selectedId, onSelect, header }: ChildSelectorProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();

  const selected = childList.find((c) => c.id === selectedId) ?? childList[0] ?? null;
  if (!selected) return null;

  const ringer = header?.ringerMode != null ? ringerMeta(header.ringerMode) : null;

  return (
    <View style={styles.container}>
      {childList.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pills}
          accessibilityLabel={tr('noe.control.selectChild')}
        >
          {childList.map((child) => {
            const active = child.id === selected.id;
            return (
              <Pressable
                key={child.id}
                accessibilityRole="button"
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => onSelect(child.id)}
              >
                <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={24} />
                <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                  {child.displayName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Avatar name={selected.displayName} emoji={selected.avatarUrl ?? undefined} size={48} />
          <View style={styles.nameCol}>
            <Text style={styles.name} numberOfLines={1}>
              {selected.displayName}
            </Text>
            <View style={styles.chips}>
              {header?.battery != null ? (
                <View style={styles.chip}>
                  <MaterialIcons name="battery-std" size={14} color={colors.textMuted} />
                  <Text style={styles.chipText}>{`${header.battery}%`}</Text>
                </View>
              ) : null}
              {ringer ? (
                <View style={styles.chip}>
                  <MaterialIcons name={ringer.icon as any} size={14} color={colors.textMuted} />
                  <Text style={styles.chipText}>{tr(ringer.key)}</Text>
                </View>
              ) : null}
              {header?.currentApp ? (
                <View style={styles.chip}>
                  <MaterialIcons name="smartphone" size={14} color={colors.textMuted} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {header.currentApp}
                  </Text>
                </View>
              ) : null}
              {header ? (
                <View style={styles.chip}>
                  <View style={[styles.dot, { backgroundColor: header.online ? colors.success : colors.textMuted }]} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {header.online
                      ? tr('noe.control.online')
                      : header.lastSeen
                        ? `${tr('noe.control.offline')} · ${relativeTime(header.lastSeen)}`
                        : tr('noe.control.offline')}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('noe.control.addChild')}
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={() => router.push(ROUTES.children as any)}
          >
            <MaterialIcons name="add" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.statsRow, pressed && styles.statsRowPressed]}
          onPress={() => router.push(ROUTES.activity as any)}
        >
          <MaterialIcons name="bar-chart" size={18} color={colors.primary} />
          <Text style={styles.statsText}>{tr('noe.control.stats')}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>
      </Card>
    </View>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    pills: { gap: spacing.sm, paddingVertical: 2 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.full,
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      maxWidth: 180,
    },
    pillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    pillText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
    },
    pillTextActive: { color: colors.primary },
    card: { gap: spacing.sm, ...shadows.sm },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    nameCol: { flex: 1, gap: spacing.xs },
    name: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 200,
    },
    chipText: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
    dot: { width: 8, height: 8, borderRadius: 4 },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    addBtnPressed: { opacity: 0.7 },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    statsRowPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    statsText: {
      flex: 1,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
    },
  });
