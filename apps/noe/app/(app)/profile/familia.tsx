import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { useAsyncData } from '@/hooks/use-async-data';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

export default function FamiliaScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamily = useCallback(() => familyService.getMyFamily(), []);
  const handleFamilyLoaded = useCallback((result: MyFamily) => {
    setFamilyName(result.family.name);
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily, handleFamilyLoaded);

  async function handleRenameFamily() {
    if (!data) return;
    setSaving(true);
    setActionError(null);
    try {
      await familyService.renameFamily(data.family.id, familyName);
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
      {/* Header with back */}
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Familia</Text>
      </Pressable>

      {/* Family name */}
      <Card>
        <Text style={styles.label}>Nombre de la familia</Text>
        <Input
          value={familyName}
          onChangeText={setFamilyName}
          placeholder="Ej: Familia García"
        />
        <Button onPress={handleRenameFamily} loading={saving} size="sm" style={{ marginTop: spacing.sm }}>
          Guardar nombre
        </Button>
      </Card>

      {/* Children list */}
      <SectionHeader title="Niños" />
      <Card>
        <EmptyState icon="👶" title="Gestiona los perfiles de tus hijos" />
      </Card>

      {/* Adults / Members */}
      <SectionHeader title="Miembros de la familia" />
      <Card>
        <Text style={styles.hint}>
          Los miembros adultos pueden administrar conjuntamente los dispositivos de los niños.
        </Text>
        <EmptyState icon="👨‍👩‍👧‍👦" title="Invita a otros padres o tutores" />
      </Card>

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
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
});
