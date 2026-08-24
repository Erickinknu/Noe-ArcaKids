import { useCallback, useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { ErrorState } from '@/components/ui/error-state';
import { parentalService } from '@/features/parental/services/parental-service';
import { errorMessage } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

interface ChildRulesData {
  rules: import('@noe-arcakids/types').ParentalRules | null;
  blockedApps: import('@noe-arcakids/types').BlockedApp[];
}

interface RulesFormProps {
  selectedChild: import('@noe-arcakids/types').ChildProfile | null;
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
  const [saving, setSaving] = useState(false);
  const [addingApp, setAddingApp] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [appLabel, setAppLabel] = useState('');
  const [actionErrorLocal, setActionErrorLocal] = useState<string | null>(null);
  const [savedFlashLocal, setSavedFlashLocal] = useState(false);
  // Use childData directly from props - component re-renders when props change

  async function handleSave() {
    if (!familyId || !selectedChild) {
      return;
    }
    setSaving(true);
    setActionErrorLocal(null);
    setSavedFlashLocal(false);
    try {
      const trimmedLimit = dailyLimitText.trim();
      const rules = await parentalService.saveRules(familyId, selectedChild.id, {
        dailyLimitMinutes: trimmedLimit === '' ? null : Number(trimmedLimit),
        bedtimeEnabled,
        bedtimeStart: bedtimeEnabled ? bedtimeStart.trim() : null,
        bedtimeEnd: bedtimeEnabled ? bedtimeEnd.trim() : null,
      });
      setSavedFlashLocal(true);
      setSavedFlashLocal(true);
    } catch (cause) {
      setActionErrorLocal(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddApp() {
    if (!familyId || !selectedChild) {
      return;
    }
    setAddingApp(true);
    setActionErrorLocal(null);
    try {
      const app = await parentalService.addBlockedApp(
        familyId,
        selectedChild.id,
        packageName,
        appLabel
      );
      setPackageName('');
      setAppLabel('');
      setPackageName('');
      setAppLabel('');
    } catch (cause) {
      setActionErrorLocal(errorMessage(cause));
    } finally {
      setAddingApp(false);
    }
  }

  async function handleRemoveApp(id: string) {
    setActionErrorLocal(null);
    try {
      await parentalService.removeBlockedApp(id);

    } catch (cause) {
      setActionErrorLocal(errorMessage(cause));
    }
  }

  if (loadingChild) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('noe.rules.loading')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {actionError ? (
        <ErrorState message={actionError} />
      ) : null}

      <Card style={styles.card}>
        <SectionHeader title={tr('noe.rules.chooseChild')} />

        {selectedChild ? (
          <View style={styles.childSection}>
            <Text style={styles.childName}>{selectedChild.displayName}</Text>

            <Text style={styles.dailyLimitText}>
              {tr('noe.rules.dailyLimit', {
                limit: dailyLimitText,
              })}
            </Text>

            <Switch
              testID="bedtime-switch"
              value={bedtimeEnabled}
              onValueChange={(value) => setBedtimeEnabled(value)}
              trackColor={{ false: colors.surface, true: colors.primary }}
              thumbColor={colors.primary}
            >
              <Text>{tr('noe.rules.bedtimeEnabled')}</Text>
            </Switch>

            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>{tr('noe.rules.bedtimeStart')}</Text>
              <Input
                style={styles.timeInput}
                value={bedtimeStart}
                onChangeText={(text) => setBedtimeStart(text)}
                placeholder={tr('noe.rules.bedtimeStartPlaceholder')}
              />
              <Text style={styles.timeLabel}>{tr('noe.rules.bedtimeEnd')}</Text>
              <Input
                style={styles.timeInput}
                value={bedtimeEnd}
                onChangeText={(text) => setBedtimeEnd(text)}
                placeholder={tr('noe.rules.bedtimeEndPlaceholder')}
              />
            </View>
          </View>
        ) : (
          <EmptyState
            icon="reglas"
            title={tr('noe.rules.selectChild')}
            description={tr('noe.rules.selectChildDesc')}
          />
        )}
      </Card>

      {savedFlashLocal && (
        <View style={styles.flash}>
          <Text style={styles.flashText}>{tr('noe.rules.savedFlash')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    ...shadows.sm,
  },
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  childSection: {
    padding: spacing.lg,
  },
  childName: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  dailyLimitText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    marginVertical: spacing.sm,
  },
  flash: {
    padding: spacing.md,
    backgroundColor: colors.success,
  },
  flashText: {
    color: colors.success,
    fontSize: typography.fontSizes.body,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  timeInput: {
    flex: 1,
    height: 40,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
});