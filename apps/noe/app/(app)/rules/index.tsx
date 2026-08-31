import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { TimeInput, DurationField } from '@/components/ui/time-picker';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useAsyncData } from '@noe-arcakids/shared';
import type { ChildProfile, ParentalRules } from '@noe-arcakids/types';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { parentalService } from '@/features/parental/services/parental-service';
import { errorMessage, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface FamilyData {
  familyId: string;
  children: ChildProfile[];
}

type ViewMode = 'list' | 'child';

export default function RulesScreen() {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [rules, setRules] = useState<ParentalRules | null>(null);
  const [loadingChild, setLoadingChild] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rule states
  const [dailyLimitMinutes, setDailyLimitMinutes] = useState(120);
  const [bedtimeOn, setBedtimeOn] = useState(false);
  const [bedtimeStartH, setBedtimeStartH] = useState(21);
  const [bedtimeStartM, setBedtimeStartM] = useState(0);
  const [bedtimeEndH, setBedtimeEndH] = useState(7);
  const [bedtimeEndM, setBedtimeEndM] = useState(0);

  // Custom schedules
  const [customSchedules, setCustomSchedules] = useState<{
    id: string;
    name: string;
    enabled: boolean;
    startH: number;
    startM: number;
    endH: number;
    endM: number;
  }[]>([]);

  const fetchFamily = useCallback(async (): Promise<FamilyData> => {
    const { family } = await familyService.getMyFamily();
    const children = await childService.listChildren(family.id);
    return { familyId: family.id, children };
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  function formatTime(h: number, m: number) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function formatDuration(totalMin: number) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  async function handleSelectChild(child: ChildProfile) {
    setSelectedChild(child);
    setLoadingChild(true);
    try {
      const r = await parentalService.getRulesByChild(child.id);
      setRules(r);
      setDailyLimitMinutes(r?.dailyLimitMinutes ?? 120);
      setBedtimeOn(r?.bedtimeEnabled ?? false);
      const sH = r?.bedtimeStart ? parseInt(r.bedtimeStart.split(':')[0], 10) : 21;
      const sM = r?.bedtimeStart ? parseInt(r.bedtimeStart.split(':')[1], 10) : 0;
      const eH = r?.bedtimeEnd ? parseInt(r.bedtimeEnd.split(':')[0], 10) : 7;
      const eM = r?.bedtimeEnd ? parseInt(r.bedtimeEnd.split(':')[1], 10) : 0;
      setBedtimeStartH(sH);
      setBedtimeStartM(sM);
      setBedtimeEndH(eH);
      setBedtimeEndM(eM);
    } catch {
      setRules(null);
      setDailyLimitMinutes(120);
      setBedtimeOn(false);
      setBedtimeStartH(21);
      setBedtimeStartM(0);
      setBedtimeEndH(7);
      setBedtimeEndM(0);
    } finally {
      setLoadingChild(false);
    }
    setViewMode('child');
  }

  async function saveRules(partial: Partial<ParentalRules>) {
    if (!selectedChild || !data) return;
    setSaving(true);
    try {
      const updated = await parentalService.saveRules(data.familyId, selectedChild.id, partial);
      setRules(updated);
      Alert.alert('Guardado', 'Los cambios se han aplicado.');
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function addCustomSchedule() {
    const newSchedule = {
      id: Date.now().toString(),
      name: 'Nuevo horario',
      enabled: true,
      startH: 8,
      startM: 0,
      endH: 9,
      endM: 0,
    };
    setCustomSchedules((prev) => [...prev, newSchedule]);
  }

  function removeCustomSchedule(id: string) {
    setCustomSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  function updateCustomSchedule(id: string, updates: Partial<typeof customSchedules[0]>) {
    setCustomSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  // ── Loading / Error ──
  if (loading) {
    return <View style={styles.screen}><LoadingState text={tr('noe.rules.loading')} /></View>;
  }
  if (error || !data) {
    return <View style={styles.screen}><ErrorState message={error ?? 'Algo salió mal'} onRetry={reload} /></View>;
  }

  // ── Child control panel ──
  if (viewMode === 'child' && selectedChild) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {/* Back */}
        <Pressable style={styles.backRow} onPress={() => setViewMode('list')}>
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backText}>Cambiar hijo</Text>
        </Pressable>

        {/* Child header */}
        <View style={styles.childHeader}>
          <Avatar name={selectedChild.displayName} emoji={selectedChild.avatarUrl ?? undefined} size={56} />
          <View>
            <Text style={styles.childName}>{selectedChild.displayName}</Text>
            <Text style={styles.childStatus}>
              {loadingChild ? 'Cargando...' : rules ? 'Reglas activas' : 'Sin reglas aún'}
            </Text>
          </View>
        </View>

        {/* ── Límite diario ── */}
        <Card style={styles.card}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#6366F118' }]}>
              <MaterialIcons name="timer" size={22} color="#6366F1" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Límite diario</Text>
              <Text style={styles.ruleValue}>{formatDuration(dailyLimitMinutes)}</Text>
            </View>
          </View>
          <DurationField totalMinutes={dailyLimitMinutes} onChange={setDailyLimitMinutes} label="Límite diario" />
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
            onPress={() => saveRules({ dailyLimitMinutes })}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar límite'}</Text>
          </Pressable>
        </Card>

        {/* ── Horario de sueño ── */}
        <Card style={styles.card}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#8B5CF618' }]}>
              <MaterialIcons name="bedtime" size={22} color="#8B5CF6" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Horario de sueño</Text>
              <Text style={styles.ruleValue}>
                {bedtimeOn ? `${formatTime(bedtimeStartH, bedtimeStartM)} – ${formatTime(bedtimeEndH, bedtimeEndM)}` : 'Desactivado'}
              </Text>
            </View>
            <Switch
              value={bedtimeOn}
              onValueChange={(v) => {
                setBedtimeOn(v);
                saveRules({ bedtimeEnabled: v, bedtimeStart: formatTime(bedtimeStartH, bedtimeStartM), bedtimeEnd: formatTime(bedtimeEndH, bedtimeEndM) });
              }}
              trackColor={{ false: colors.border, true: '#8B5CF6' }}
            />
          </View>
          {bedtimeOn && (
            <>
              <Text style={styles.timeSectionLabel}>Dormir</Text>
              <TimeInput hours={bedtimeStartH} minutes={bedtimeStartM} onHoursChange={setBedtimeStartH} onMinutesChange={setBedtimeStartM} label="" />
              <Text style={styles.timeSectionLabel}>Despertar</Text>
              <TimeInput hours={bedtimeEndH} minutes={bedtimeEndM} onHoursChange={setBedtimeEndH} onMinutesChange={setBedtimeEndM} label="" />
              <Pressable
                style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
                onPress={() => saveRules({ bedtimeEnabled: true, bedtimeStart: formatTime(bedtimeStartH, bedtimeStartM), bedtimeEnd: formatTime(bedtimeEndH, bedtimeEndM) })}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar horario'}</Text>
              </Pressable>
            </>
          )}
        </Card>

        {/* ── Horario personalizado ── */}
        <Card style={styles.card}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#05966918' }]}>
              <MaterialIcons name="event" size={22} color="#059669" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Horarios personalizados</Text>
              <Text style={styles.ruleDesc}>Biblia, escuela, actividades, etc.</Text>
            </View>
          </View>

          {customSchedules.map((sch) => (
            <View key={sch.id} style={styles.customRow}>
              <View style={styles.customTop}>
                <Pressable onPress={() => updateCustomSchedule(sch.id, { enabled: !sch.enabled })}>
                  <MaterialIcons name={sch.enabled ? 'check-circle' : 'radio-button-unchecked'} size={22} color={sch.enabled ? '#059669' : colors.textMuted} />
                </Pressable>
                <Text style={[styles.customName, !sch.enabled && { color: colors.textMuted }]}>{sch.name}</Text>
                <Pressable onPress={() => {
                  Alert.alert('Eliminar horario', `¿Eliminar "${sch.name}"?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => removeCustomSchedule(sch.id) },
                  ]);
                }}>
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
          ))}

          <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]} onPress={addCustomSchedule}>
            <MaterialIcons name="add-circle-outline" size={20} color="#059669" />
            <Text style={styles.addBtnText}>Agregar horario</Text>
          </Pressable>
        </Card>

        {/* ── Accesos rápidos ── */}
        <Text style={styles.sectionLabel}>Control avanzado</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: 'schedule' as const, title: 'Horarios de uso', color: '#6366F1', path: '/rules/horarios' },
            { icon: 'school' as const, title: 'Modo estudio', color: '#059669', path: '/rules/modo-estudio' },
            { icon: 'location-on' as const, title: 'Zonas seguras', color: '#D97706', path: '/rules/geofencing' },
            { icon: 'language' as const, title: 'Filtrado web', color: '#DC2626', path: '/rules/filtrado-web' },
            { icon: 'apps' as const, title: 'Control de apps', color: '#EA580C', path: '/rules/apps' },
          ].map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
              onPress={() => router.push({ pathname: item.path as any, params: item.path === '/rules/apps' && selectedChild ? { childId: selectedChild.id } : undefined })}
            >
              <View style={[styles.quickIcon, { backgroundColor: item.color + '18' }]}>
                <MaterialIcons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.quickTitle}>{item.title}</Text>
              <MaterialIcons name="chevron-right" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  // ── Children list ──
  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Control parental</Text>
      <Text style={styles.subtitle}>Selecciona un hijo para configurar sus reglas</Text>

      {data.children.length === 0 ? (
        <EmptyState icon="👶" title="Agrega un hijo primero" description="Ve a la pestaña Hijos para agregar un perfil" />
      ) : (
        <View style={styles.childList}>
          {data.children.map((child) => (
            <Pressable
              key={child.id}
              style={({ pressed }) => [styles.childCard, pressed && styles.childCardPressed]}
              onPress={() => handleSelectChild(child)}
            >
              <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={48} />
              <View style={styles.childCardInfo}>
                <Text style={styles.childCardName}>{child.displayName}</Text>
                <Text style={styles.childCardMeta}>Toca para configurar</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
  title: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  subtitle: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  card: { ...shadows.sm },

  // Child list
  childList: { gap: spacing.sm },
  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  childCardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  childCardInfo: { flex: 1 },
  childCardName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childCardMeta: { fontSize: typography.fontSizes.caption, color: colors.textMuted },

  // Back + header
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { fontSize: typography.fontSizes.body, color: colors.primary, fontWeight: typography.fontWeights.medium },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  childName: { fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.text },
  childStatus: { fontSize: typography.fontSizes.caption, color: colors.textMuted },

  // Rule rows
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ruleInfo: { flex: 1 },
  ruleTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  ruleValue: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  ruleDesc: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  timeSectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.xs },

  // Save
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },

  // Custom schedules
  customRow: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  customTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customName: { flex: 1, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  customTimes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginTop: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: '#059669', borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  addBtnPressed: { backgroundColor: '#05966918' },
  addBtnText: { fontSize: typography.fontSizes.body, color: '#059669', fontWeight: typography.fontWeights.medium },

  // Quick grid
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  quickCardPressed: { borderColor: colors.primary },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  quickTitle: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.medium, color: colors.text, marginBottom: spacing.xs },
});
