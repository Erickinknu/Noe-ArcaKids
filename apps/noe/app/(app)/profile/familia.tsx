import { useCallback, useMemo, useState } from 'react';
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
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function FamiliaScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
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
        <View style={styles.inviteRow}>
          <Pressable
            style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed]}
            onPress={() => Alert.alert('Invitar co-padre', 'Se abrirá el diálogo de compartir con el código de invitación de la familia.')}
          >
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Invitar padre/tutor</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed]}
            onPress={() => Alert.alert('Código de familia', `Código: ${data?.family.id?.slice(0, 8) ?? 'N/A'}\nComparte este código con el otro padre para que se una.`)}
          >
            <MaterialIcons name="vpn-key" size={20} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Ver código</Text>
          </Pressable>
        </View>
      </Card>

      {actionError ? <ErrorState message={actionError} /> : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  inviteRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inviteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  inviteBtnPressed: {
    backgroundColor: colors.primaryLight,
  },
  inviteBtnText: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.medium,
    color: colors.primary,
  },
});
