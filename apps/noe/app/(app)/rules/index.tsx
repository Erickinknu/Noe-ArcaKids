import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useAsyncData } from '@/hooks/use-async-data';
import type { ChildProfile, ParentalRules } from '@noe-arcakids/types';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { parentalService } from '@/features/parental/services/parental-service';
import { errorMessage, colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

interface FamilyData {
  familyId: string;
  children: ChildProfile[];
}

export default function RulesScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [rules, setRules] = useState<ParentalRules | null>(null);
  const [loadingChild, setLoadingChild] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Rule states
  const [dailyLimit, setDailyLimit] = useState('');
  const [bedtimeOn, setBedtimeOn] = useState(false);
  const [bedtimeStart, setBedtimeStart] = useState('21:00');
  const [bedtimeEnd, setBedtimeEnd] = useState('07:00');

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

  async function handleSelectChild(child: ChildProfile) {
    setSelectedChild(child);
    setLoadingChild(true);
    try {
      const r = await parentalService.getRulesByChild(child.id);
      setRules(r);
      setDailyLimit(r?.dailyLimitMinutes != null ? String(r.dailyLimitMinutes) : '');
      setBedtimeOn(r?.bedtimeEnabled ?? false);
      setBedtimeStart(r?.bedtimeStart ?? '21:00');
      setBedtimeEnd(r?.bedtimeEnd ?? '07:00');
    } catch {
      // No rules yet — use defaults
      setRules(null);
      setDailyLimit('');
      setBedtimeOn(false);
      setBedtimeStart('21:00');
      setBedtimeEnd('07:00');
    } finally {
      setLoadingChild(false);
    }
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

  async function handleSaveDailyLimit() {
    const val = dailyLimit.trim();
    await saveRules({ dailyLimitMinutes: val === '' ? null : Number(val) });
  }

  async function handleToggleBedtime(val: boolean) {
    setBedtimeOn(val);
    await saveRules({
      bedtimeEnabled: val,
      bedtimeStart: val ? bedtimeStart : null,
      bedtimeEnd: val ? bedtimeEnd : null,
    });
  }

  async function handleSaveBedtime() {
    await saveRules({ bedtimeEnabled: true, bedtimeStart, bedtimeEnd });
  }

  // ── Loading / Error states ──
  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('noe.rules.loading')} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error ?? 'Algo salió mal'} onRetry={reload} />
      </View>
    );
  }

  // ── Child selected → show control panel ──
  if (selectedChild) {
    return (
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* Back + child header */}
        <Pressable style={styles.backRow} onPress={() => setSelectedChild(null)}>
          <MaterialIcons name="arrow-back" size={22} color={colors.primary} />
          <Text style={styles.backText}>Cambiar hijo</Text>
        </Pressable>

        <View style={styles.childHeader}>
          <Avatar name={selectedChild.displayName} emoji={selectedChild.avatarUrl ?? undefined} size={56} />
          <View>
            <Text style={styles.childName}>{selectedChild.displayName}</Text>
            <Text style={styles.childStatus}>
              {loadingChild ? 'Cargando reglas...' : rules ? 'Reglas configuradas' : 'Sin reglas aún'}
            </Text>
          </View>
        </View>

        {/* ── Límite diario ── */}
        <Card style={styles.card}>
          <View style={styles.ruleRow}>
            <View style={styles.ruleIconBox}>
              <MaterialIcons name="timer" size={22} color={colors.primary} />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Límite diario</Text>
              <Text style={styles.ruleDesc}>Minutos máximos de uso por día</Text>
            </View>
          </View>
          <View style={styles.limitInputRow}>
            <TextInput
              style={styles.limitInput}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              placeholder="Ej: 120"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
            />
            <Text style={styles.limitUnit}>min/día</Text>
            <Pressable
              style={({ pressed }) => [styles.saveSmallBtn, pressed && styles.saveSmallBtnPressed, saving && styles.saveSmallBtnDisabled]}
              onPress={handleSaveDailyLimit}
              disabled={saving}
            >
              <Text style={styles.saveSmallBtnText}>{saving ? '...' : 'Guardar'}</Text>
            </Pressable>
          </View>
        </Card>

        {/* ── Horario de sueño ── */}
        <Card style={styles.card}>
          <View style={styles.ruleRow}>
            <View style={styles.ruleIconBox}>
              <MaterialIcons name="bedtime" size={22} color={colors.primary} />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Horario de sueño</Text>
              <Text style={styles.ruleDesc}>Bloqueo automático durante la noche</Text>
            </View>
            <Switch
              value={bedtimeOn}
              onValueChange={handleToggleBedtime}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          {bedtimeOn && (
            <View style={styles.timeInputRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Dormir</Text>
                <TextInput
                  style={styles.timeInput}
                  value={bedtimeStart}
                  onChangeText={setBedtimeStart}
                  placeholder="21:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
              <MaterialIcons name="arrow-forward" size={18} color={colors.textMuted} />
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Despertar</Text>
                <TextInput
                  style={styles.timeInput}
                  value={bedtimeEnd}
                  onChangeText={setBedtimeEnd}
                  placeholder="07:00"
                  placeholderTextColor={colors.textMuted}
                  maxLength={5}
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.saveSmallBtn, pressed && styles.saveSmallBtnPressed]}
                onPress={handleSaveBedtime}
                disabled={saving}
              >
                <Text style={styles.saveSmallBtnText}>{saving ? '...' : 'OK'}</Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* ── Accesos rápidos ── */}
        <Text style={styles.sectionLabel}>Control avanzado</Text>
        <View style={styles.quickGrid}>
          {[
            { icon: 'schedule' as const, title: 'Horarios', color: '#6366F1', path: '/rules/horarios' },
            { icon: 'school' as const, title: 'Modo estudio', color: '#059669', path: '/rules/modo-estudio' },
            { icon: 'location-on' as const, title: 'Zonas', color: '#D97706', path: '/rules/geofencing' },
            { icon: 'language' as const, title: 'Filtrado web', color: '#DC2626', path: '/rules/filtrado-web' },
          ].map((item) => (
            <Pressable
              key={item.title}
              style={({ pressed }) => [styles.quickCard, pressed && styles.quickCardPressed]}
              onPress={() => router.push(item.path as any)}
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

  // ── Default: children list ──
  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
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

const styles = StyleSheet.create({
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

  // Back + child header
  backRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { fontSize: typography.fontSizes.body, color: colors.primary, fontWeight: typography.fontWeights.medium },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md },
  childName: { fontSize: typography.fontSizes.title, fontWeight: typography.fontWeights.bold, color: colors.text },
  childStatus: { fontSize: typography.fontSizes.caption, color: colors.textMuted },

  // Rule rows
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  ruleIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  ruleInfo: { flex: 1 },
  ruleTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  ruleDesc: { fontSize: typography.fontSizes.caption, color: colors.textMuted },

  // Daily limit
  limitInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  limitInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.fontSizes.body, color: colors.text, backgroundColor: colors.background, textAlign: 'center' },
  limitUnit: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  saveSmallBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  saveSmallBtnPressed: { opacity: 0.85 },
  saveSmallBtnDisabled: { opacity: 0.5 },
  saveSmallBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.semibold },

  // Bedtime
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  timeBox: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginBottom: spacing.xs },
  timeInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: typography.fontSizes.body, color: colors.text, backgroundColor: colors.background, textAlign: 'center', width: '100%' },

  // Quick grid
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickCard: { width: '48%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  quickCardPressed: { borderColor: colors.primary },
  quickIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  quickTitle: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.medium, color: colors.text, marginBottom: spacing.xs },
});
