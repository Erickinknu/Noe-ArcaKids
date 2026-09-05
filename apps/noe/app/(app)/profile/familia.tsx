import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Share,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import type { ChildProfile } from '@noe-arcakids/types';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { Card, Input, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function FamiliaScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [familyName, setFamilyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchFamilyAndChildren = useCallback(async () => {
    const familyData = await familyService.getMyFamily();
    const children = familyData.family.id
      ? await childService.listChildren(familyData.family.id)
      : [];
    return { familyData, children };
  }, []);
  const handleFamilyLoaded = useCallback(
    (result: { familyData: MyFamily; children: ChildProfile[] }) => {
      setFamilyName(result.familyData.family.name);
    },
    []
  );
  const { data, error, loading, reload } = useAsyncData(fetchFamilyAndChildren, handleFamilyLoaded);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  async function handleRenameFamily() {
    if (!data) return;
    setSaving(true);
    setActionError(null);
    try {
      await familyService.renameFamily(data.familyData.family.id, familyName);
    } catch (cause: any) {
      setActionError(cause?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <View style={styles.screen}><LoadingState text="Cargando..." /></View>;
  if (error && !data) return <View style={styles.screen}><ErrorState message={error} onRetry={reload} /></View>;
  if (!data) return <View style={styles.screen}><LoadingState text="Cargando..." /></View>;

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
        {data.children.length === 0 ? (
          <EmptyState
            icon="👶"
            title="Aún no hay perfiles"
            description="Añade el perfil de tu hijo desde la pestaña Hijos para personalizar su control."
            action={{
              label: 'Añadir hijo',
              onPress: () => router.push('/(app)/children')
              }}
          />
        ) : (
          data.children.map((child) => (
            <Pressable
              key={child.id}
              style={({ pressed }) => [
                styles.childRow,
                pressed && styles.childRowPressed,
              ]}
              onPress={() => router.push(`/children/${child.id}` as any)}
            >
              <Avatar
                name={child.displayName}
                emoji={child.avatarUrl ?? '👶'}
                size={40}
              />
              <Text style={styles.childName}>{child.displayName}</Text>
              <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
            </Pressable>
          ))
        )}
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
            onPress={() =>
              Share.share({
                message:
                  'Únete a la familia en NOE para administrar juntos la seguridad digital de los niños. Descarga NOE e inicia sesión para compartir el control parental.',
              }).catch(() => {})
            }
          >
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
            <Text style={styles.inviteBtnText}>Invitar padre/tutor</Text>
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
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  childRowPressed: {
    opacity: 0.6,
  },
  childName: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
});
