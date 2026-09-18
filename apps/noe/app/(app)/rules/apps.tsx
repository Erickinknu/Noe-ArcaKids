import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, useTheme, radius, spacing, typography, errorMessage, type ThemeColors } from '@noe-arcakids/shared';
import {
  appCategoryService,
  type ChildApp,
  type AppCategory,
} from '@/features/app-categories/services/app-category-service';
import {
  suggestForPresets,
  presetActionLabel,
  type AppPreset,
} from '@/features/app-categories/constants/app-presets';
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
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [apps, setApps] = useState<ChildApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('limited');
  const [searchQuery, setSearchQuery] = useState('');
  const [childName, setChildName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [limitModalApp, setLimitModalApp] = useState<ChildApp | null>(null);
  const [appliedPresets, setAppliedPresets] = useState<Set<string>>(() => new Set());
  const [dismissedPresets, setDismissedPresets] = useState<Set<string>>(() => new Set());
  const [savingPreset, setSavingPreset] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const runFetch = async () => {
      if (cancelled) return;
      await fetchApps();
    };
    runFetch();
    return () => { cancelled = true; };
  }, [fetchApps]);

  const filteredApps = apps.filter((app) => {
    const matchesTab = app.category === activeTab;
    const matchesSearch =
      searchQuery === '' ||
      app.appLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.packageName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const suggestions = useMemo(() => suggestForPresets(apps), [apps]);
  const pendingSuggestions = suggestions.filter(
    (group) => !appliedPresets.has(group.preset.key) && !dismissedPresets.has(group.preset.key)
  );

  async function applyPreset(preset: AppPreset, groupApps: ChildApp[]) {
    if (!childId) return;
    setSavingPreset(preset.key);
    try {
      for (const app of groupApps) {
        await appCategoryService.setCategory(
          childId,
          app.packageName,
          app.appLabel,
          preset.category,
          preset.timeLimitMinutes
        );
      }
      const ids = new Set(groupApps.map((app) => app.id));
      setApps((prev) =>
        prev.map((a) =>
          ids.has(a.id)
            ? { ...a, category: preset.category, timeLimitMinutes: preset.timeLimitMinutes ?? null }
            : a
        )
      );
      setAppliedPresets((prev) => new Set(prev).add(preset.key));
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSavingPreset(null);
    }
  }

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
    setLimitModalApp(app);
  }

  async function handleRemoveLimit(app: ChildApp) {
    if (!childId) return;
    setSavingId(app.id);
    try {
      await appCategoryService.setCategory(childId, app.packageName, app.appLabel, 'free');
      setApps((prev) =>
        prev.map((a) =>
          a.id === app.id ? { ...a, category: 'free', timeLimitMinutes: null } : a
        )
      );
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSavingId(null);
    }
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

      {/* Reglas sugeridas */}
      {pendingSuggestions.length > 0 && (
        <Card style={styles.sugCard}>
          <View style={styles.sugHeader}>
            <MaterialIcons name="lightbulb-outline" size={18} color="#D97706" />
            <Text style={styles.sugTitle}>Reglas sugeridas</Text>
          </View>
          <Text style={styles.sugSubtitle}>
            Basadas en la categoría de las apps instaladas. Toca ✓ para aplicar.
          </Text>
          {pendingSuggestions.map((group) => (
            <View key={group.preset.key} style={styles.sugRow}>
              <View
                style={[styles.sugIcon, { backgroundColor: group.preset.color + '18' }]}
              >
                <MaterialIcons name={group.preset.icon as any} size={18} color={group.preset.color} />
              </View>
              <View style={styles.sugInfo}>
                <Text style={styles.sugName}>{group.preset.label}</Text>
                <Text style={styles.sugMeta}>
                  {group.apps.length} app{group.apps.length > 1 ? 's' : ''} · {presetActionLabel(group.preset)}
                </Text>
              </View>
              {savingPreset === group.preset.key ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.sugApplyBtn, pressed && styles.actionBtnPressed]}
                  onPress={() => applyPreset(group.preset, group.apps)}
                >
                  <MaterialIcons name="check-circle" size={22} color={colors.primary} />
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.sugDismissBtn, pressed && styles.actionBtnPressed]}
                onPress={() =>
                  setDismissedPresets((prev) => new Set(prev).add(group.preset.key))
                }
              >
                <MaterialIcons name="close" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

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
                  onPress={() => promptTimeLimit(app)}
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

      {limitModalApp ? (
        <TimeLimitModal
          app={limitModalApp}
          saving={savingId !== null}
          onCancel={() => setLimitModalApp(null)}
          onSave={(app, minutes) => {
            setLimitModalApp(null);
            handleSetTimeLimit(app, minutes);
          }}
          onRemove={(app) => {
            setLimitModalApp(null);
            handleRemoveLimit(app);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

function TimeLimitModal({
  app,
  saving,
  onCancel,
  onSave,
  onRemove,
}: {
  app: ChildApp | null;
  saving: boolean;
  onCancel: () => void;
  onSave: (app: ChildApp, minutes: number) => void;
  onRemove: (app: ChildApp) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [minutes, setMinutes] = useState(() => app?.timeLimitMinutes ?? 60);

  const clamp = (m: number) => Math.min(1440, Math.max(1, Math.round(m)));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Límite de tiempo</Text>
          {app ? <Text style={styles.modalSubtitle}>{app.appLabel}</Text> : null}

          <View style={styles.modalSteppers}>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes - 60))}>
              <MaterialIcons name="remove" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>1h</Text>
            </Pressable>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes - 15))}>
              <MaterialIcons name="remove" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>15m</Text>
            </Pressable>
            <Text style={styles.modalValue}>{formatDuration(minutes)}</Text>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes + 15))}>
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>15m</Text>
            </Pressable>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes + 60))}>
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>1h</Text>
            </Pressable>
          </View>

          <View style={styles.modalChips}>
            {[15, 30, 60, 90, 120].map((m) => (
              <Pressable
                key={m}
                style={[styles.modalChip, minutes === m && styles.modalChipActive]}
                onPress={() => setMinutes(m)}
              >
                <Text style={[styles.modalChipText, minutes === m && styles.modalChipTextActive]}>
                  {m} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalInputRow}>
            <MaterialIcons name="edit" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.modalInput}
              value={String(minutes)}
              onChangeText={(text) => {
                if (text === '') {
                  setMinutes(1);
                  return;
                }
                const parsed = parseInt(text, 10);
                if (!Number.isNaN(parsed)) setMinutes(clamp(parsed));
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.modalInputSuffix}>min / día</Text>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [styles.modalRemoveBtn, pressed && styles.modalBtnPressed]}
              disabled={saving}
              onPress={() => app && onRemove(app)}
            >
              <Text style={styles.modalRemoveText}>Quitar límite</Text>
            </Pressable>
            <View style={styles.modalActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.modalCancelBtn, pressed && styles.modalBtnPressed]}
                disabled={saving}
                onPress={onCancel}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalSaveBtn, pressed && styles.modalBtnPressed]}
                disabled={saving}
                onPress={() => app && onSave(app, minutes)}
              >
                <Text style={styles.modalSaveText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  childChipText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.primary },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },

  // Sugerencias
  sugCard: { padding: spacing.md, gap: spacing.xs },
  sugHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sugTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  sugSubtitle: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginBottom: spacing.xs },
  sugRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  sugIcon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  sugInfo: { flex: 1, gap: 1 },
  sugName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  sugMeta: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  sugApplyBtn: { padding: spacing.xs },
  sugDismissBtn: { padding: spacing.xs },

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

  // Time limit modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  modalSubtitle: { fontSize: typography.fontSizes.body, color: colors.textMuted },
  modalSteppers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  modalStepBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 44, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  modalStepLabel: { fontSize: typography.fontSizes.caption, color: colors.primary, fontWeight: typography.fontWeights.medium },
  modalValue: { minWidth: 84, textAlign: 'center', fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.text },
  modalChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  modalChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  modalChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modalChipText: { fontSize: typography.fontSizes.caption, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  modalChipTextActive: { color: colors.onPrimary },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: colors.background },
  modalInput: { flex: 1, textAlign: 'center', paddingVertical: spacing.xs, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  modalInputSuffix: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  modalActions: { gap: spacing.sm },
  modalRemoveBtn: { alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.danger + '0D' },
  modalRemoveText: { color: colors.danger, fontWeight: typography.fontWeights.semibold },
  modalActionsRow: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  modalCancelText: { color: colors.text, fontWeight: typography.fontWeights.semibold },
  modalSaveBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  modalSaveText: { color: colors.onPrimary, fontWeight: typography.fontWeights.semibold },
  modalBtnPressed: { opacity: 0.85 },
});
