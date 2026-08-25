import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { useAsyncData } from '@/hooks/use-async-data';
import RulesForm from '@/components/ui/rules-form';
import BlockedAppsSection from '@/components/ui/blocked-apps-section';
import type { BlockedApp, ChildProfile, ParentalRules } from '@noe-arcakids/types';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { parentalService } from '@/features/parental/services/parental-service';
import { errorMessage, colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

interface FamilyWithChildren {
  familyId: string;
  children: ChildProfile[];
}

export default function RulesScreen() {
  const { t: tr } = useTranslation();
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [childData, setChildData] = useState<{ rules: ParentalRules | null; blockedApps: BlockedApp[] } | null>(null);
  const [loadingChild, setLoadingChild] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyLimitText, setDailyLimitText] = useState('');
  const [bedtimeEnabled, setBedtimeEnabled] = useState(false);
  const [bedtimeStart, setBedtimeStart] = useState('');
  const [bedtimeEnd, setBedtimeEnd] = useState('');
  const [, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamily = useCallback(async (): Promise<FamilyWithChildren> => {
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

  async function loadChildData(child: ChildProfile) {
    setLoadingChild(true);
    setActionError(null);
    try {
      const [rules, blockedApps] = await Promise.all([
        parentalService.getRulesByChild(child.id),
        parentalService.listBlockedApps(child.id),
      ]);
      setChildData({ rules, blockedApps });
      setDailyLimitText(
        rules?.dailyLimitMinutes != null ? String(rules.dailyLimitMinutes) : ''
      );
      setBedtimeEnabled(rules?.bedtimeEnabled ?? false);
      setBedtimeStart(rules?.bedtimeStart ?? '');
      setBedtimeEnd(rules?.bedtimeEnd ?? '');
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setLoadingChild(false);
    }
  }

  function handleSelect(child: ChildProfile) {
    setSelectedChild(child);
    setChildData(null);
    loadChildData(child);
  }

  async function handleSave() {
    if (!selectedChild || !childData) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setSavedFlash(false);
    try {
      const trimmedLimit = dailyLimitText.trim();
      const rules = await parentalService.saveRules(
        childData.rules?.familyId ?? '',
        selectedChild.id,
        {
          dailyLimitMinutes: trimmedLimit === '' ? null : Number(trimmedLimit),
          bedtimeEnabled,
          bedtimeStart: bedtimeEnabled ? bedtimeStart.trim() : null,
          bedtimeEnd: bedtimeEnabled ? bedtimeEnd.trim() : null,
        }
      );
      setChildData((current) => (current ? { ...current, rules } : current));
      setSavedFlash(true);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveApp(id: string) {
    setActionError(null);
    try {
      await parentalService.removeBlockedApp(id);
      setChildData((current) =>
        current
          ? {
              ...current,
              blockedApps: current.blockedApps.filter((app) => app.id !== id),
            }
          : current
      );
    } catch (cause) {
      setActionError(errorMessage(cause));
    }
  }

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
        <ErrorState
          message={error ?? tr('noe.rules.somethingWentWrong')}
          onRetry={reload}
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>{tr('noe.rules.title')}</Text>
      <Text style={styles.subtitle}>{tr('noe.rules.subtitle')}</Text>

      <Card style={styles.card}>
        <SectionHeader title={tr('noe.rules.chooseChild')} />
        {data.children.length === 0 ? (
          <EmptyState icon="规则" title={tr('noe.rules.noChildren')} />
        ) : (
          <View style={styles.childList}>
            {data.children.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => handleSelect(child)}
                style={[
                  styles.childRow,
                  child.id === selectedChild?.id && styles.childSelected,
                ]}
              >
                <Text style={styles.childName}>{child.displayName}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Card>

      {selectedChild ? (
        <RulesForm
          selectedChild={selectedChild}
          familyId={data?.familyId ?? null}
          childData={childData}
          loadingChild={loadingChild}
          onSave={handleSave}
          onAction={handleRefresh}
          savedFlash={savedFlash}
          actionError={actionError}
          dailyLimitText={dailyLimitText}
          setDailyLimitText={setDailyLimitText}
          bedtimeEnabled={bedtimeEnabled}
          setBedtimeEnabled={setBedtimeEnabled}
          bedtimeStart={bedtimeStart}
          setBedtimeStart={setBedtimeStart}
          bedtimeEnd={bedtimeEnd}
          setBedtimeEnd={setBedtimeEnd}
        />
      ) : null}

      {selectedChild ? (
        <BlockedAppsSection
          childData={childData}
          onRemoveApp={handleRemoveApp}
        />
      ) : null}

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  card: {
    ...shadows.sm,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 24,
  },
  childList: {
    gap: spacing.xs,
  },
  childRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  childName: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
});