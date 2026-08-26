import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐸', '🐵', '🦋', '🌟', '🚀'];

export default function ChildrenScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, error, loading, reload } = useAsyncData(fetchChildren);

  async function handleAdd() {
    setAdding(true);
    setActionError(null);
    try {
      const { family } = await familyService.getMyFamily();
      await childService.addChild(family.id, displayName, selectedAvatar);
      setDisplayName('');
      setSelectedAvatar(AVATARS[0]);
      await reload();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('noe.children.loading')} />
      </View>
    );
  }

  if (error && !children) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]} keyboardShouldPersistTaps="handled">
      <SectionHeader title={tr('noe.children.title')} />
      {children ? (
        <>
          {children.length === 0 ? (
            <EmptyState icon="👶" title={tr('noe.children.empty')} />
          ) : (
            <>
              {children.map((child) => (
                <Pressable key={child.id} onPress={() => router.push({ pathname: '/children/[childId]', params: { childId: child.id } })}>
                  <Card style={styles.childCard}>
                    <View style={styles.childRow}>
                      <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={48} />
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{child.displayName}</Text>
                        <Text style={styles.childMeta}>
                          {tr('noe.children.memberSince', {
                            date: new Date(child.createdAt).toLocaleDateString(),
                          })}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
              ))}

              {/* ── Recompensas ── */}
              <SectionHeader title="Recompensas de tiempo" />
              <Card style={styles.card}>
                <Text style={styles.rewardDesc}>
                  Otorga tiempo extra a tus hijos como recompensa por buen comportamiento.
                </Text>
                {children.map((child) => (
                  <View key={child.id} style={styles.rewardRow}>
                    <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={32} />
                    <Text style={styles.rewardName}>{child.displayName}</Text>
                    <Pressable
                      style={({ pressed }) => [styles.rewardBtn, pressed && styles.rewardBtnPressed]}
                      onPress={() => Alert.alert('Recompensa', `Se otorgaron 30 minutos extra a ${child.displayName}`)}
                    >
                      <MaterialIcons name="add-circle" size={18} color={colors.success} />
                      <Text style={styles.rewardBtnText}>+30min</Text>
                    </Pressable>
                  </View>
                ))}
              </Card>

              {/* ── SOS ── */}
              <SectionHeader title="SOS de emergencia" />
              <Card style={styles.sosCard}>
                <View style={styles.sosRow}>
                  <View style={styles.sosIconBox}>
                    <MaterialIcons name="warning" size={28} color={colors.danger} />
                  </View>
                  <View style={styles.sosInfo}>
                    <Text style={styles.sosTitle}>Botón de pánico</Text>
                    <Text style={styles.sosDesc}>
                      Envía la ubicación actual del niño a todos los padres de la familia por WhatsApp y SMS.
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.sosBtn, pressed && styles.sosBtnPressed]}
                  onPress={() => Alert.alert(
                    'SOS de emergencia',
                    'Se enviará la ubicación actual a todos los padres. ¿Continuar?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Enviar SOS', style: 'destructive', onPress: () => Alert.alert('Enviado', 'Ubicación enviada a todos los padres.') },
                    ]
                  )}
                >
                  <MaterialIcons name="emergency" size={22} color={colors.onPrimary} />
                  <Text style={styles.sosBtnText}>Activar SOS</Text>
                </Pressable>
              </Card>
            </>
          )}
          <SectionHeader title={tr('noe.children.addTitle')} />
          <Card style={styles.addCard}>
            <Input
              label={tr('noe.children.nameLabel')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={tr('noe.children.namePlaceholder')}
            />
            <Text style={styles.avatarLabel}>{tr('noe.children.pickAvatar')}</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <View key={emoji} style={[styles.avatarWrapper, emoji === selectedAvatar && styles.avatarSelected]}>
                  <Avatar
                    name={emoji}
                    emoji={emoji}
                    size={40}
                  />
                </View>
              ))}
            </View>
            <Button
              onPress={handleAdd}
              loading={adding}
              disabled={displayName.trim().length === 0}
            >
              {tr('noe.children.add')}
            </Button>
          </Card>
          {actionError ? <ErrorState message={actionError} /> : null}
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
  childCard: {
    ...shadows.sm,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  childMeta: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  addCard: {
    ...shadows.sm,
  },
  avatarLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.full,
  },
  avatarSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  card: { ...shadows.sm },
  rewardDesc: { fontSize: typography.fontSizes.body, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 22 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rewardName: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
  rewardBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.successLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full },
  rewardBtnPressed: { opacity: 0.85 },
  rewardBtnText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.semibold, color: colors.success },
  sosCard: { ...shadows.sm, borderColor: colors.danger, borderWidth: 1.5 },
  sosRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  sosIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  sosInfo: { flex: 1 },
  sosTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.bold, color: colors.danger },
  sosDesc: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
  sosBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: spacing.md },
  sosBtnPressed: { opacity: 0.85 },
  sosBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
});
