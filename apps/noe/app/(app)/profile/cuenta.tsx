import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { useAsyncData } from '@/hooks/use-async-data';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

export default function CuentaScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamily = useCallback(() => familyService.getMyFamily(), []);
  const handleLoaded = useCallback((result: MyFamily) => {
    setDisplayName(result.profile.displayName || '');
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily, handleLoaded);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setActionError(null);
    setSavedFlash(false);
    try {
      // TODO: Call profile update service when available
      await new Promise((r) => setTimeout(r, 500));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (cause: any) {
      setActionError(cause?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.screen}><LoadingState text="Cargando..." /></View>;
  if (error && !data) return <View style={styles.screen}><ErrorState message={error} onRetry={reload} /></View>;

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Perfil</Text>
      </Pressable>

      <Card style={styles.avatarCard}>
        <Avatar name={data?.profile.displayName || ''} size={72} />
        <Text style={styles.email}>{data?.profile.email || '—'}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Nombre</Text>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
        />
      </Card>

      <Card>
        <Text style={styles.label}>Correo electrónico</Text>
        <Text style={styles.value}>{data?.profile.email || '—'}</Text>
        <Text style={styles.hint}>El correo no se puede modificar desde aquí.</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Familia</Text>
        <Text style={styles.value}>{data?.family.name || '—'}</Text>
      </Card>

      <Button onPress={handleSave} loading={saving}>
        {savedFlash ? 'Guardado ✓' : 'Guardar cambios'}
      </Button>

      {actionError ? <ErrorState message={actionError} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  avatarCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  email: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  hint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
