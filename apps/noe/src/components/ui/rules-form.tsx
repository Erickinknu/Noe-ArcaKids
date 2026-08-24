import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { parentalService } from '@/features/parental/services/parental-service';
import { errorMessage } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

interface RulesFormProps {
  selectedChild: ChildProfile | null;
  familyId: string | null;
  childData: ChildRulesData | null;
  loadingChild: boolean;
  onSave: () => void;
  onAction: () => void;
  savedFlash: boolean;
  actionError: string | null;
  dailyLimitText: string;
  setDailyLimitText: (text: string) => void;
  bedtimeEnabled: boolean;
  setBedtimeEnabled: (value: boolean) => void;
  bedtimeStart: string;
  setBedtimeStart: (value: string) => void;
  bedtimeEnd: string;
  setBedtimeEnd: (value: string) => void;
}

interface ChildRulesData {
  rules: ParentalRules | null;
  blockedApps: BlockedApp[];
}

export default function RulesForm({
  selectedChild,
  familyId,
  childData,
  loadingChild,
  onSave,
  onAction,
  savedFlash,
  actionError,
  dailyLimitText,
  setDailyLimitText,
  bedtimeEnabled,
  setBedtimeEnabled,
  bedtimeStart,
  setBedtimeStart,
  bedtimeEnd,
  setBedtimeEnd,
}: RulesFormProps) {
  const { t: tr } = useTranslation();

  async function handleSave() {
    if (!familyId || !selectedChild) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setSavedFlash(false);
    try {
      const trimmedLimit = dailyLimitText.trim();
      const rules = await parentalService.saveRules(familyId, selectedChild.id, {
        dailyLimitMinutes: trimmedLimit === '' ? null : Number(trimmedLimit),
        bedtimeEnabled,
        bedtimeStart: bedtimeEnabled ? bedtimeStart.trim() : null,
        bedtimeEnd: bedtimeEnabled ? bedtimeEnd.trim() : null,
      });
      setChildData((current) => (current ? { ...current, rules } : current));
      setSavedFlash(true);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  function handleAddApp() {
    if (!familyId || !selectedChild) {
      return;
    }
    setAddingApp(true);
    setActionError(null);
    try {
      const app = await parentalService.addBlockedApp(
        familyId,
        selectedChild.id,
        packageName,
        appLabel
      );
      setChildData((current) =>
        current ? { ...current, blockedApps: [...current.blockedApps, app] } : current
      );
      setPackageName('');
      setAppLabel('');
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setAddingApp(false);
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

  if (loadingChild) {
    return <LoadingState text={tr('common.loading')} />;
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
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
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
        <Card style={styles.card}>
          <SectionHeader title={tr('noe.rules.rulesFor', { name: selectedChild.displayName })} />

          <Input
            label={tr('noe.rules.dailyLimitLabel')}
            placeholder={tr('noe.rules.dailyLimitPlaceholder')}
            value={dailyLimitText}
            onChangeText={setDailyLimitText}
            keyboardType="number-pad"
            inputMode="numeric"
          />
          <Text style={styles.hint}>{tr('noe.rules.dailyLimitHint')}</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{tr('noe.rules.bedtimeTitle')}</Text>
            <Switch
              value={bedtimeEnabled}
              onValueChange={setBedtimeEnabled}
              trackColor={{ true: colors.primary }}
            />
          </View>
          {bedtimeEnabled ? (
            <View style={styles.timeRow}>
              <Input
                label={tr('noe.rules.bedtimeStart')}
                placeholder="21:00"
                value={bedtimeStart}
                onChangeText={setBedtimeStart}
                maxLength={5}
                style={styles.timeInput}
              />
              <Input
                label={tr('noe.rules.bedtimeEnd')}
                placeholder="07:00"
                value={bedtimeEnd}
                onChangeText={setBedtimeEnd}
                maxLength={5}
                style={styles.timeInput}
              />
            </View>
          ) : null}

          <Button onPress={handleSave} loading={saving}>
            {tr('noe.rules.save')}
          </Button>
          {savedFlash ? (
            <Text style={styles.saved}>{tr('noe.rules.saved')}</Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <SectionHeader title={tr('noe.rules.blockedAppsTitle')} />
          {(childData?.blockedApps.length ?? 0) === 0 ? (
            <EmptyState icon="📱" title={tr('noe.rules.blockedAppsEmpty')} />
          ) : (
            <View style={styles.appList}>
              {childData?.blockedApps.map((app) => (
                <View key={app.id} style={styles.appRow}>
                  <View style={styles.appInfo}>
                    <Text style={styles.appLabel}>{app.appLabel}</Text>
                    <Text style={styles.appPackage}>{app.packageName}</Text>
                  </View>
                  <Pressable onPress={() => handleRemoveApp(app.id)}>
                    <Text style={styles.removeText}>{tr('noe.rules.removeApp')}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <Input
            label={tr('noe.rules.packageNameLabel')}
            placeholder={tr('noe.rules.packageNamePlaceholder')}
            value={packageName}
            onChangeText={setPackageName}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label={tr('noe.rules.appLabelLabel')}
            placeholder={tr('noe.rules.appLabelPlaceholder')}
            value={appLabel}
            onChangeText={setAppLabel}
          />
          <Button variant="outline" onPress={handleAddApp} loading={addingApp}>
            {tr('noe.rules.addApp')}
          </Button>
        </Card>
      ) : null}
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
  saved: {
    color: colors.success,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  appList: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  appInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  appLabel: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  appPackage: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  removeText: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
});