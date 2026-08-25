import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { authService } from '@/features/auth/services/auth-service';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function ProfileScreen() {
  const { t: tr } = useTranslation();
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamily = useCallback(() => familyService.getMyFamily(), []);
  const handleFamilyLoaded = useCallback((result: MyFamily) => {
    setFamilyName(result.family.name);
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily, handleFamilyLoaded);

  async function handleRename() {
    if (!data) {
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      await familyService.renameFamily(data.family.id, familyName);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await authService.signOut();
    } catch (cause) {
      setActionError(errorMessage(cause));
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('noe.profile.loading')} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <SectionHeader title={tr('noe.profile.title')} />
      {data ? (
        <>
          <Card>
            <Text style={styles.label}>{tr('noe.profile.name')}</Text>
            <Text style={styles.value}>{data.profile.displayName || '—'}</Text>
            <Text style={styles.label}>{tr('noe.profile.email')}</Text>
            <Text style={styles.value}>{data.profile.email || '—'}</Text>
            <Text style={styles.label}>{tr('noe.profile.family')}</Text>
            <Text style={styles.value}>{data.family.name}</Text>
          </Card>
          <SectionHeader title={tr('noe.profile.familyName')} />
          <Card>
            <Input
              label={tr('noe.profile.family')}
              value={familyName}
              onChangeText={setFamilyName}
              placeholder={tr('noe.profile.familyPlaceholder')}
            />
            <Button onPress={handleRename} loading={saving}>
              {tr('noe.profile.saveFamilyName')}
            </Button>
          </Card>
          {actionError ? <ErrorState message={actionError} /> : null}
          <Button variant="outline" onPress={handleSignOut}>
            {tr('noe.profile.signOut')}
          </Button>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  value: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
});
