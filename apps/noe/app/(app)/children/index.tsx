import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

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
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐸', '🐵', '🦋', '🌟', '🚀'];

export default function ChildrenScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
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
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <SectionHeader title={tr('noe.children.title')} />
      {children ? (
        <>
          {children.length === 0 ? (
            <EmptyState icon="👶" title={tr('noe.children.empty')} />
          ) : (
            children.map((child) => (
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
                  </View>
                </Card>
              </Pressable>
            ))
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
});
