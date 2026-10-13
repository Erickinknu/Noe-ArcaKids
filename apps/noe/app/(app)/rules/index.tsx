import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { ROUTES } from '@/constants';
import type { ChildProfile } from '@noe-arcakids/types';
import { errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { parentalService } from '@/features/parental/services/parental-service';
import { deviceControlService } from '@/features/device-control/services/device-control-service';
import { studyModeService, type StudySchedule } from '@/features/study-mode/services/study-mode-service';
import { controlService } from '@/features/control/services/control-service';
import { ChildSelector } from '@/features/control/components/child-selector';
import { FreeTimeCard } from '@/features/control/components/free-time-card';
import { AppCategoryCard } from '@/features/control/components/app-category-card';
import { AppSelectorModal } from '@/features/control/components/app-selector-modal';
import { SchedulesCard } from '@/features/control/components/schedules-card';
import { LocationMiniCard } from '@/features/control/components/location-mini-card';
import {
  type CategoryLists,
  type ChildHeader,
  type ControlCategory,
  type TopFreeTime,
} from '@/features/control/components/control-types';

interface FamilyData {
  familyId: string;
  children: ChildProfile[];
}

interface BedtimeParts {
  startH: number;
  startM: number;
  endH: number;
  endM: number;
}

function parseTime(value: string | null, fallbackH: number, fallbackM: number): { h: number; m: number } {
  if (!value) return { h: fallbackH, m: fallbackM };
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return { h: fallbackH, m: fallbackM };
  return { h, m };
}

function formatTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function RulesScreen() {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const screenPadding = useScreenPadding();

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [lists, setLists] = useState<CategoryLists | null>(null);
  const [topFree, setTopFree] = useState<TopFreeTime | null>(null);
  const [header, setHeader] = useState<ChildHeader | null>(null);
  const [studyEnabled, setStudyEnabled] = useState(false);
  const [studySchedule, setStudySchedule] = useState<StudySchedule | null>(null);
  const [bedtimeOn, setBedtimeOn] = useState(false);
  const [bedtime, setBedtime] = useState<BedtimeParts>({ startH: 21, startM: 0, endH: 7, endM: 0 });
  const [location, setLocation] = useState<{ latitude: number; longitude: number; online: boolean } | null>(null);
  const [loadingChild, setLoadingChild] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [selectorFor, setSelectorFor] = useState<ControlCategory | null>(null);

  const fetchFamily = useCallback(async (): Promise<FamilyData> => {
    const { family } = await familyService.getMyFamily();
    const children = await childService.listChildren(family.id);
    return { familyId: family.id, children };
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily);

  const loadChild = useCallback(async (childId: string) => {
    setLoadingChild(true);
    try {
      const [listsRes, topRes, headerRes, rules, study, locations] = await Promise.all([
        controlService.getCategoryLists(childId).catch(() => null),
        controlService.getTopFreeTime(childId).catch(() => null),
        controlService.getChildHeader(childId).catch(() => null),
        parentalService.getRulesByChild(childId).catch(() => null),
        studyModeService.getSchedule(childId).catch(() => null),
        deviceControlService.getChildrenLocations().catch(() => []),
      ]);
      setLists(listsRes);
      setTopFree(topRes);
      const ringer = headerRes?.ringerMode;
      setHeader(
        headerRes
          ? {
              ...headerRes,
              ringerMode: ringer === 'normal' || ringer === 'vibrate' || ringer === 'silent' ? ringer : null,
            }
          : null
      );
      if (rules) {
        setBedtimeOn(rules.bedtimeEnabled);
        const s = parseTime(rules.bedtimeStart, 21, 0);
        const e = parseTime(rules.bedtimeEnd, 7, 0);
        setBedtime({ startH: s.h, startM: s.m, endH: e.h, endM: e.m });
      } else {
        setBedtimeOn(false);
      }
      if (study) {
        setStudyEnabled(study.enabled);
        setStudySchedule(study);
      } else {
        setStudyEnabled(false);
        setStudySchedule(null);
      }
      const loc = (locations ?? []).find((l) => l.childId === childId) ?? null;
      setLocation(
        loc && loc.latitude != null && loc.longitude != null
          ? { latitude: loc.latitude, longitude: loc.longitude, online: loc.isOnline }
          : null
      );
    } finally {
      setLoadingChild(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  // Hijo efectivo: el elegido si sigue en la lista, si no el primero.
  // Derivado en render (sin setState en efectos).
  const effectiveChildId = useMemo(() => {
    if (!data || data.children.length === 0) return null;
    if (selectedChildId && data.children.some((c) => c.id === selectedChildId)) {
      return selectedChildId;
    }
    return data.children[0].id;
  }, [data, selectedChildId]);

  useEffect(() => {
    if (!effectiveChildId) return;
    // Diferido a microtarea: loadChild hace setState al arrancar y la regla
    // react-hooks/set-state-in-effect exige no llamarlo síncrono en el efecto.
    const id = effectiveChildId;
    void Promise.resolve().then(() => loadChild(id));
  }, [effectiveChildId, loadChild]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const selectedChild = data?.children.find((c) => c.id === effectiveChildId) ?? null;

  async function handleEditLimit(minutes: number) {
    if (!selectedChild) return;
    setSavingLimit(true);
    try {
      await controlService.setLimit(selectedChild.id, 'tiempo_libre', minutes);
      await loadChild(selectedChild.id);
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    } finally {
      setSavingLimit(false);
    }
  }

  async function handleBlockNow() {
    if (!selectedChild) return;
    try {
      await controlService.blockFreeTimeNow(selectedChild.id);
      await loadChild(selectedChild.id);
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    }
  }

  async function handleToggleMaster(value: boolean) {
    if (!selectedChild || !data) return;
    setSavingRules(true);
    try {
      const schedule = studySchedule ?? { enabled: false, days: [], hours: {} };
      await studyModeService.saveSchedule({ ...schedule, enabled: value }, selectedChild.id);
      const start = formatTime(bedtime.startH, bedtime.startM);
      const end = formatTime(bedtime.endH, bedtime.endM);
      const updated = await parentalService.saveRules(
        data.familyId,
        selectedChild.id,
        value ? { bedtimeEnabled: true, bedtimeStart: start, bedtimeEnd: end } : { bedtimeEnabled: false }
      );
      setStudyEnabled(value);
      setBedtimeOn(updated.bedtimeEnabled);
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    } finally {
      setSavingRules(false);
    }
  }

  async function handleToggleBedtime(value: boolean) {
    if (!selectedChild || !data) return;
    setSavingRules(true);
    try {
      const updated = await parentalService.saveRules(
        data.familyId,
        selectedChild.id,
        value
          ? {
              bedtimeEnabled: true,
              bedtimeStart: formatTime(bedtime.startH, bedtime.startM),
              bedtimeEnd: formatTime(bedtime.endH, bedtime.endM),
            }
          : { bedtimeEnabled: false }
      );
      setBedtimeOn(updated.bedtimeEnabled);
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    } finally {
      setSavingRules(false);
    }
  }

  async function handleSaveBedtime() {
    if (!selectedChild || !data) return;
    setSavingRules(true);
    try {
      const updated = await parentalService.saveRules(data.familyId, selectedChild.id, {
        bedtimeEnabled: true,
        bedtimeStart: formatTime(bedtime.startH, bedtime.startM),
        bedtimeEnd: formatTime(bedtime.endH, bedtime.endM),
      });
      setBedtimeOn(updated.bedtimeEnabled);
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    } finally {
      setSavingRules(false);
    }
  }

  const candidates = useMemo(() => {
    if (!lists) return [];
    const seen = new Set<string>();
    const out: CategoryLists['sinClasificar'] = [];
    for (const app of [...lists.tiempoLibre, ...lists.siempre, ...lists.noPermitidas, ...lists.sinClasificar]) {
      if (!app || seen.has(app.packageName)) continue;
      seen.add(app.packageName);
      out.push(app);
    }
    return out;
  }, [lists]);

  const selectorSelected = useMemo(() => {
    if (!lists || !selectorFor) return [];
    const source =
      selectorFor === 'tiempo_libre' ? lists.tiempoLibre : selectorFor === 'siempre' ? lists.siempre : lists.noPermitidas;
    return (source ?? []).map((a) => a.packageName);
  }, [lists, selectorFor]);

  const selectorTitle =
    selectorFor === 'tiempo_libre'
      ? tr('noe.control.freeTime')
      : selectorFor === 'siempre'
        ? tr('noe.control.always')
        : tr('noe.control.blocked');

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
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

  if (data.children.length === 0) {
    return (
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: screenPadding.paddingTop }]}>
        <Text style={styles.title}>{tr('noe.control.title')}</Text>
        <Text style={styles.subtitle}>{tr('noe.control.subtitle')}</Text>
        <EmptyState
          icon={<MaterialIcons name="child-care" size={48} color={colors.textMuted} />}
          title={tr('noe.control.noChildren')}
          description={tr('noe.control.subtitle')}
        />
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.addChildBtn, pressed && styles.addChildBtnPressed]}
          onPress={() => router.push(ROUTES.children as any)}
        >
          <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.addChildText}>{tr('noe.control.addChild')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: screenPadding.paddingTop }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        <Text style={styles.title}>{tr('noe.control.title')}</Text>
        <Text style={styles.subtitle}>{tr('noe.control.subtitle')}</Text>

        <ChildSelector
          childList={data.children}
          selectedId={effectiveChildId}
          onSelect={setSelectedChildId}
          header={header}
        />

        {loadingChild && !lists ? (
          <LoadingState text={tr('common.loading')} />
        ) : (
          <>
            <FreeTimeCard
              data={topFree}
              childName={selectedChild?.displayName ?? ''}
              savingLimit={savingLimit}
              onOpenMore={() => setSelectorFor('tiempo_libre')}
              onEditLimit={handleEditLimit}
              onBlockNow={handleBlockNow}
            />

            <AppCategoryCard
              icon="check-circle"
              accent={colors.success}
              title={tr('noe.control.always')}
              apps={lists?.siempre ?? []}
              maxShown={5}
              actionLabel={tr('noe.control.moreApps', { n: (lists?.siempre.length ?? 0) - 5 })}
              actionVisible={(lists?.siempre.length ?? 0) > 5}
              onAction={() => setSelectorFor('siempre')}
            />

            <AppCategoryCard
              icon="block"
              accent={colors.danger}
              title={tr('noe.control.blocked')}
              apps={[]}
              showList={false}
              actionLabel={tr('noe.control.chooseApps')}
              onAction={() => setSelectorFor('no_permitida')}
            />

            <SchedulesCard
              masterOn={studyEnabled && bedtimeOn}
              studyEnabled={studyEnabled}
              bedtimeOn={bedtimeOn}
              bedtime={bedtime}
              saving={savingRules}
              onToggleMaster={handleToggleMaster}
              onToggleBedtime={handleToggleBedtime}
              onBedtimeTime={(field, value) => setBedtime((prev) => ({ ...prev, [field]: value }))}
              onSaveBedtime={handleSaveBedtime}
              onOpenStudy={() => router.push('/rules/modo-estudio' as any)}
              onOpenRest={() => router.push('/rules/horarios' as any)}
            />

            {selectedChild ? (
              <LocationMiniCard
                childName={selectedChild.displayName}
                latitude={location?.latitude ?? null}
                longitude={location?.longitude ?? null}
                online={location?.online ?? header?.online ?? false}
                onOpenMap={() => router.push('/location' as any)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {selectedChild && selectorFor ? (
        <AppSelectorModal
          key={`${selectedChild.id}-${selectorFor}`}
          visible
          title={selectorTitle}
          childId={selectedChild.id}
          category={selectorFor}
          candidates={candidates}
          initialSelected={selectorSelected}
          onClose={() => setSelectorFor(null)}
          onSaved={() => loadChild(selectedChild.id)}
        />
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors, _shadows: ThemeShadows) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.surface },
    scroll: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
    title: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
    subtitle: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
    addChildBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    addChildBtnPressed: { opacity: 0.85 },
    addChildText: {
      color: colors.onPrimary,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
    },
  });
