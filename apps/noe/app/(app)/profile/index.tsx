import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function ProfileScreen() {
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
        <Text style={styles.muted}>Loading your profile...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
        <Button variant="outline" onPress={reload}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Profile</Text>
      {data ? (
        <>
          <Card>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.profile.displayName || '—'}</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.profile.email || '—'}</Text>
            <Text style={styles.label}>Family</Text>
            <Text style={styles.value}>{data.family.name}</Text>
          </Card>
          <Card>
            <Text style={styles.cardTitle}>Family name</Text>
            <Input
              label="Family"
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="e.g. The Smiths"
            />
            <Button onPress={handleRename} loading={saving}>
              Save family name
            </Button>
          </Card>
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
          <Button variant="outline" onPress={handleSignOut}>
            Sign out
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
    paddingTop: 80,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
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
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
  },
});