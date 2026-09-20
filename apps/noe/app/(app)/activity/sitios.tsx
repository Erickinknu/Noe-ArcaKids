import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import {
  webVisitsService,
  type WebVisit,
} from '@/features/web-filter/services/web-visits-service';
import { Card, useTheme, useAsyncData, spacing, typography, radius, type ThemeColors } from '@noe-arcakids/shared';

interface VisitGroup {
  dateLabel: string;
  items: WebVisit[];
}

function groupByDay(visits: WebVisit[]): VisitGroup[] {
  const byDate = new Map<string, WebVisit[]>();
  for (const visit of visits) {
    const d = new Date(visit.visitedAt);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const label = `${cap(d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' }))} · ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
    byDate.set(label, [...(byDate.get(label) ?? []), visit]);
  }
  const groups = Array.from(byDate.entries())
    .map(([dateLabel, items]) => ({ dateLabel, items }))
    .sort((a, b) => (a.items[0].visitedAt < b.items[0].visitedAt ? 1 : -1));
  return groups;
}

function displayHost(hostname: string): string {
  return hostname.length > 40 ? `${hostname.slice(0, 40)}…` : hostname;
}

export default function WebVisitsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const screenPadding = useScreenPadding();
  const { childId, childName } = useLocalSearchParams<{ childId?: string; childName?: string }>();
  const [refreshing, setRefreshing] = useState(false);

  const fetchVisits = useCallback(
    () => (childId ? webVisitsService.getChildWebVisits(childId, 7) : Promise.resolve([] as WebVisit[])),
    [childId]
  );
  const { data: visits, loading, error, reload } = useAsyncData<WebVisit[]>(fetchVisits);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  const openSite = useCallback((hostname: string) => {
    Linking.openURL(`https://${hostname}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el sitio.')
    );
  }, []);

  if (loading && !visits) return <LoadingState text="Cargando sitios visitados…" />;
  if (error && !visits) return <ErrorState message={error} onRetry={reload} />;

  const groups = groupByDay(visits ?? []);
  const blockedCount = (visits ?? []).filter((v) => v.blocked).length;

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <SectionHeader title={`Sitios visitados${childName ? ` · ${childName}` : ''}`} />
      <Text style={styles.subtitle}>
        Dominios navegados por el dispositivo durante los últimos 7 días. Los sitios bloqueados por el
        filtrado web se marcan con 🚫.
      </Text>
      {blockedCount > 0 ? (
        <Text style={styles.summaryChip}>
          {blockedCount} {blockedCount === 1 ? 'sitio bloqueado' : 'sitios bloqueados'}
        </Text>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          icon="🌐"
          title="Aún no hay sitios visitados"
          description="El historial de dominios aparecerá aquí cuando el filtrado web del dispositivo de tu hijo reporte navegación."
        />
      ) : (
        groups.map((group) => (
          <View key={group.dateLabel} style={styles.group}>
            <Text style={styles.groupLabel}>{group.dateLabel}</Text>
            <Card style={styles.card}>
              {group.items.map((visit, i) => (
                <Pressable
                  key={`${visit.hostname}-${visit.visitedAt}`}
                  style={[styles.row, i < group.items.length - 1 && styles.rowBorder]}
                  onPress={() => openSite(visit.hostname)}
                >
                  <View style={[styles.iconWrap, visit.blocked ? styles.iconBlocked : styles.iconOk]}>
                    <MaterialIcons
                      name={visit.blocked ? 'block' : 'public'}
                      size={18}
                      color={visit.blocked ? colors.danger : colors.success}
                    />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.host} numberOfLines={1}>{displayHost(visit.hostname)}</Text>
                    <Text style={styles.time}>
                      {visit.blocked ? 'Bloqueado por filtrado web' : 'Visita registrada'}
                    </Text>
                  </View>
                  <MaterialIcons name="open-in-new" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </Card>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { paddingTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
    subtitle: { fontSize: typography.fontSizes.caption, color: colors.textMuted, lineHeight: 20 },
    summaryChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.dangerLight,
      color: colors.danger,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      overflow: 'hidden',
    },
    group: { gap: spacing.xs },
    groupLabel: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text, marginTop: spacing.xs },
    card: { gap: 0 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    iconOk: { backgroundColor: colors.successLight },
    iconBlocked: { backgroundColor: colors.dangerLight },
    rowInfo: { flex: 1 },
    host: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
    time: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  });