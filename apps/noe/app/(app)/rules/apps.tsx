import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, shadows, spacing, typography, errorMessage } from '@noe-arcakids/shared';
import {
  appCategoryService,
  type ChildApp,
  type AppCategory,
} from '@/features/app-categories/services/app-category-service';
import { familyService } from '@/features/family/services/family-service';
import { childService } from '@/features/children/services/child-service';

type Tab = 'limited' | 'blocked' | 'free';

const TAB_CONFIG: { key: Tab; label: string; color: string; icon: string }[] = [
  { key: 'limited', label: 'Con límite', color: '#D97706', icon: 'timer' },
  { key: 'blocked', label: 'Bloqueadas', color: '#DC2626', icon: 'block' },
  { key: 'free', label: 'Libres', color: '#059669', icon: 'check-circle' },
];

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export default function AppsControlScreen() {
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const screenPadding = useScreenPadding();

  const [apps, setApps] = useState<ChildApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('limited');
  const [searchQuery, setSearchQuery] = useState('');
  const [childName, setChildName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchApps = useCallback(async (isRefresh = false) => {
    if (!childId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [childApps] = await Promise.all([
        appCategoryService.getCategories(childId),
        (async () => {
          try {
            const { family } = await familyService.getMyFamily();
            const children = await childService.listChildren(family.id);
            const found = children.find((c) => c.id === childId);
            if (found) setChildName(found.displayName);
          } catch {
            // child name is cosmetic — don't block on failure
          }
        })(),
      ]);
      setApps(childApps);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const filteredApps = apps.filter((app) => {
    const matchesTab = app.category === activeTab;
    const matchesSearch =
      searchQuery === '' ||
      app.appLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  async function handleChangeCategory(app: ChildApp, newCategory: AppCategory) {
    if (!childId) return;
    setSavingId(app.id);
    try {
      await appCategoryService.setCategory(
        childId,
        app.packageName,
        app.appLabel,
        newCategory,
        newCategory === 'limited' ? (app.timeLimitMinutes ?? 60) : undefined
      );
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? {
                ...a,
                category: newCategory,
                timeLimitMinutes: newCategory === 'limited' ? (a.timeLimitMinutes ?? 60) : null,
              }
            : a
        )
      );
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  async function handleSetTimeLimit(app: ChildApp, minutes: number) {
    if (!childId) return;
    setSavingId(app.id);
    try {
      await appCategoryService.setCategory(
        childId,
        app.packageName,
        app.appLabel,
        'limited',
        minutes
      );
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, category: 'limited', timeLimitMinutes: minutes } : a
        )
      );
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSavingId(null);
    }
  }

  function promptTimeLimit(app: ChildApp) {
    Alert.alert('Límite de tiempo', `¿Cuánto tiempo permitir para ${app.appLabel}?`, [
      { text: '15 min', onPress: () => handleSetTimeLimit(app, 15) },
      { text: '30 min', onPress: () => handleSetTimeLimit(app, 30) },
      { text: '60 min', onPress: () => handleSetTimeLimit(app, 60) },
      { text: '90 min', onPress: () => handleSetTimeLimit(app, 90) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function promptMoveApp(app: ChildApp) {
    const otherTabs = TAB_CONFIG.filter((t) => t.key !== app.category);
    Alert.alert(
      'Mover app',
      `¿A qué categoría mover "${app.appLabel}"?`,
      [
        ...otherTabs.map((t) => ({
          text: t.label,
          onPress: () => handleChangeCategory(app, t.key),
        })),
        { text: 'Cancelar', style: 'cancel' as const },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text="Cargando apps..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => fetchApps()} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchApps(true)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Control de apps</Text>
      </Pressable>

      {childName ? (
        <View style={styles.childChip}>
          <Avatar name={childName} size={24} />
          <Text style={styles.childChipText}>{childName}</Text>
        </View>
      ) : null}

      <Text style={styles.description}>
        Clasifica las apps de tu hijo como con límite, bloqueadas o libres.
      </Text>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar app..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TAB_CONFIG.map((tab) => {
          const count = apps.filter((a) => a.category === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tab, isActive && { backgroundColor: tab.color + '18', borderColor: tab.color }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <MaterialIcons
                name={tab.icon as any}
                size={16}
                color={isActive ? tab.color : colors.textMuted}
              />
              <Text style={[styles.tabLabel, isActive && { color: tab.color }]}>
                {tab.label}
              </Text>
              <View style={[styles.tabBadge, isActive && { backgroundColor: tab.color }]}>
                <Text style={[styles.tabBadgeText, isActive && { color: '#FFFFFF' }]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* App list */}
      {filteredApps.length === 0 ? (
        <EmptyState
          icon={<MaterialIcons name="apps" size={48} color={colors.textMuted} />}
          title={searchQuery ? 'Sin resultados' : 'No hay apps en esta categoría'}
          description={searchQuery ? 'Intenta con otro término' : 'Las apps aparecerán cuando se sincronicen desde el dispositivo'}
        />
      ) : (
        filteredApps.map((app) => (
          <Card key={app.id} style={styles.appCard}>
            <View style={styles.appRow}>
              <View style={styles.appIconWrap}>
                <MaterialIcons name="android" size={24} color={colors.primary} />
              </View>
              <View style={styles.appInfo}>
                <Text style={styles.appName} numberOfLines={1}>{app.appLabel}</Text>
                <Text style={styles.appPackage} numberOfLines={1}>{app.packageName}</Text>
                {app.category === 'limited' && app.timeLimitMinutes != null && (
                  <Text style={styles.appLimit}>
                    Límite: {formatDuration(app.timeLimitMinutes)}
                  </Text>
                )}
              </View>
              {savingId === app.id ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Pressable style={styles.moveBtn} onPress={() => promptMoveApp(app)}>
                  <MaterialIcons name="swap-horiz" size={20} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {/* Quick action row */}
            {activeTab === 'limited' && (
              <View style={styles.appActions}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => promptTimeLimit(app)}
                >
                  <MaterialIcons name="timer" size={14} color="#D97706" />
                  <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Ajustar tiempo</Text>
                </Pressable>
              </View>
            )}
            {activeTab === 'free' && (
              <View style={styles.appActions}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => handleChangeCategory(app, 'blocked')}
                >
                  <MaterialIcons name="block" size={14} color="#DC2626" />
                  <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Bloquear</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => handleChangeCategory(app, 'limited')}
                >
                  <MaterialIcons name="timer" size={14} color="#D97706" />
                  <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Poner límite</Text>
                </Pressable>
              </View>
            )}
            {activeTab === 'blocked' && (
              <View style={styles.appActions}>
                <Pressable
                  style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => handleChangeCategory(app, 'free')}
                >
                  <MaterialIcons name="check-circle" size={14} color="#059669" />
                  <Text style={[styles.actionBtnText, { color: '#059669' }]}>Desbloquear</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  childChipText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.primary },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.background, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text, paddingVertical: spacing.xs },

  // Tabs
  tabRow: { flexDirection: 'row', gap: spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  tabLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted },
  tabBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.textMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  tabBadgeText: { fontSize: 10, fontWeight: typography.fontWeights.bold, color: '#FFFFFF' },

  // App cards
  appCard: { padding: spacing.md },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  appIconWrap: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  appInfo: { flex: 1, gap: 2 },
  appName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  appPackage: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  appLimit: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: '#D97706', marginTop: 2 },
  moveBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // Actions
  appActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.background },
  actionBtnPressed: { opacity: 0.7 },
  actionBtnText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium },
});
