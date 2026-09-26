import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import type { ChildProfile, FamilyMode } from '@noe-arcakids/types';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { familyInviteService, buildInviteLink, type FamilyInvite } from '@/features/family-invites/services/family-invite-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { Card, Input, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface ModeOption {
  value: FamilyMode;
  icon: string;
  label: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: 'general', icon: 'public', label: 'General', description: '+' },
  { value: 'cristiano', icon: 'church', label: 'Cristiano', description: '+' },
  { value: 'educativo', icon: 'school', label: 'Educativo', description: '+' },
];

export default function FamiliaScreen() {
  const router = useRouter();
  const { t: tr } = useTranslation();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [familyName, setFamilyName] = useState('');
  const [mode, setMode] = useState<FamilyMode>('general');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [invite, setInvite] = useState<FamilyInvite | null>(null);
  const [generating, setGenerating] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

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
      setMode(result.familyData.family.mode ?? 'general');
      setInvite(null);
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
      await reload();
    } catch (cause: any) {
      setActionError(cause?.message ?? 'Error');
    } finally {
      setSaving(false);
    }
  }

  async function handleInviteResponsible() {
    if (!data) return;
    setGenerating(true);
    setActionError(null);
    try {
      const generated = await familyInviteService.createInvite(data.familyData.family.id);
      setInvite(generated);
      const link = buildInviteLink(generated.code);
      const message = tr('noe.familyInvites.shareMessage', {
        code: generated.code,
        link,
      });
      await Share.share({ message }).catch(() => {});
    } catch (cause: any) {
      setActionError(cause?.message ?? tr('noe.familyInvites.inviteFailed'));
    } finally {
      setGenerating(false);
    }
  }

  async function handleModeChange(next: FamilyMode) {
    if (!data || next === mode) return;
    setSavingMode(true);
    setActionError(null);
    try {
      await familyService.setFamilyMode(data.familyData.family.id, next);
      setMode(next);
    } catch (cause: any) {
      setActionError(cause?.message ?? 'Error');
    } finally {
      setSavingMode(false);
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
      <Card style={styles.card}>
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

      {/* Vincular dispositivo */}
      <Card style={styles.card}>
        <View style={styles.linkRow}>
          <View style={[styles.linkIconBox, { backgroundColor: colors.primaryLight }]}>
            <MaterialIcons name="link" size={24} color={colors.primary} />
          </View>
          <View style={styles.linkInfo}>
            <Text style={styles.linkTitle}>Vincular dispositivo</Text>
            <Text style={styles.linkDesc}>
              Genera un código y QR para conectar la app ARCA KIDS de tu hijo con esta familia.
            </Text>
          </View>
        </View>
        <Button onPress={() => router.push('/(app)/linking')} style={{ marginTop: spacing.md }}>
          Vincular dispositivo
        </Button>
      </Card>

      {/* Children list */}
      <SectionHeader title="Niños" />
      <Card style={styles.card}>
        {data.children.length === 0 ? (
          <EmptyState
            icon={<MaterialIcons name="child-care" size={48} color={colors.textMuted} />}
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

      {/* Content mode */}
      <SectionHeader title={tr('noe.familyMode.title')} />
      <Card style={styles.card}>
        <Text style={styles.hint}>{tr('noe.familyMode.description')}</Text>
        {MODE_OPTIONS.map((option) => {
          const active = option.value === mode;
          return (
            <Pressable
              key={option.value}
              style={({ pressed }) => [styles.modeRow, pressed && styles.modeRowPressed]}
              onPress={() => handleModeChange(option.value)}
              disabled={savingMode}
            >
              <MaterialIcons name={option.icon as any} size={22} color={active ? colors.primary : colors.textMuted} />
              <View style={styles.modeInfo}>
                <Text style={[styles.modeLabel, active && { color: colors.primary }]}>{option.label}</Text>
                <Text style={styles.modeDesc}>
                  {option.value === 'general'
                    ? tr('noe.familyMode.generalDesc')
                    : option.value === 'cristiano'
                      ? tr('noe.familyMode.cristianoDesc')
                      : tr('noe.familyMode.educativoDesc')}
                </Text>
              </View>
              {active ? <MaterialIcons name="check-circle" size={22} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
        {savingMode ? <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} /> : null}
        <Text style={styles.hint}>{tr('noe.familyMode.sharing')}</Text>
      </Card>

      {/* Adults / Caregivers */}
      <SectionHeader title="Responsables" />
      <Card style={styles.card}>
        <Text style={styles.hint}>
          Los responsables pueden administrar conjuntamente los dispositivos de los niños.
        </Text>
        <View style={styles.inviteRow}>
          <Pressable
            style={({ pressed }) => [styles.inviteBtn, pressed && styles.inviteBtnPressed]}
            onPress={handleInviteResponsible}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <MaterialIcons name="person-add" size={20} color={colors.primary} />
                <Text style={styles.inviteBtnText}>{tr('noe.familyInvites.shareTitle')}</Text>
              </>
            )}
          </Pressable>
        </View>

        {invite ? (
          <View style={styles.inviteResult}>
            <Text style={styles.inviteHint}>{tr('noe.familyInvites.shareHint')}</Text>
            <Pressable
              style={({ pressed }) => [styles.inviteCodeBox, pressed && styles.inviteCodeBoxPressed]}
              onPress={() => Share.share({
                message: tr('noe.familyInvites.shareMessage', {
                  code: invite.code,
                  link: buildInviteLink(invite.code),
                }),
              }).catch(() => {})}
            >
              <View style={styles.inviteCodeInfo}>
                <Text style={styles.inviteCodeLabel}>{tr('noe.familyInvites.codeLabel')}</Text>
                <Text style={styles.inviteCodeText}>{invite.code}</Text>
              </View>
              <MaterialIcons name="share" size={20} color={colors.primary} />
            </Pressable>
            <Button
              onPress={() => Share.share({
                message: tr('noe.familyInvites.shareMessage', {
                  code: invite.code,
                  link: buildInviteLink(invite.code),
                }),
              }).catch(() => {})}
              style={{ marginTop: spacing.sm }}
            >
              Compartir invitación
            </Button>
          </View>
        ) : null}
      </Card>

      {actionError ? <ErrorState message={actionError} /> : null}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  card: {
    ...shadows.sm,
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  linkDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
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
  inviteResult: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  inviteHint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  inviteCodeBoxPressed: {
    opacity: 0.7,
  },
  inviteCodeInfo: {
    gap: 2,
  },
  inviteCodeLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  inviteCodeText: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    letterSpacing: 4,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeRowPressed: {
    opacity: 0.7,
  },
  modeInfo: {
    flex: 1,
    gap: 2,
  },
  modeLabel: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  modeDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
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
