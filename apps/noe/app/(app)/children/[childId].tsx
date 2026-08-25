import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐸', '🐵', '🦋', '🌟', '🚀'];

interface ChildDetail {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function ChildDetailScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();

  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const fetchChild = async (): Promise<ChildDetail> => {
    const { family } = await familyService.getMyFamily();
    const children = await childService.listChildren(family.id);
    const child = children.find((c) => c.id === childId);
    if (!child) throw new Error(tr('noe.children.notFound'));
    return {
      id: child.id,
      displayName: child.displayName,
      avatarUrl: child.avatarUrl,
      createdAt: child.createdAt,
    };
  };

  const handleLoaded = (data: ChildDetail) => {
    if (!loaded) {
      setDisplayName(data.displayName);
      setSelectedAvatar(data.avatarUrl ?? AVATARS[0]);
      setLoaded(true);
    }
  };

  const { data: child, error, loading, reload } = useAsyncData(fetchChild, handleLoaded);

  async function handleSave() {
    if (!child) return;
    setSaving(true);
    setActionError(null);
    try {
      await childService.updateChild(child.id, displayName, selectedAvatar);
      router.back();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!child) return;
    Alert.alert(
      tr('noe.children.deleteTitle'),
      tr('noe.children.deleteConfirm', { name: child.displayName }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.children.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await childService.removeChild(child.id);
              router.back();
            } catch (cause) {
              setActionError(errorMessage(cause));
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  if (error || !child) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error ?? tr('common.unexpected')} onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <SectionHeader title={tr('noe.children.editTitle')} />

      <Card style={styles.card}>
        <View style={styles.avatarSection}>
          <Avatar name={child.displayName} emoji={selectedAvatar} size={80} />
          <Text style={styles.avatarHint}>{tr('noe.children.pickAvatar')}</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <View key={emoji} style={[styles.avatarWrapper, emoji === selectedAvatar && styles.avatarSelected]}>
                <Avatar name={emoji} emoji={emoji} size={40} />
              </View>
            ))}
          </View>
        </View>

        <Input
          label={tr('noe.children.nameLabel')}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={tr('noe.children.namePlaceholder')}
        />

        <Text style={styles.memberSince}>
          {tr('noe.children.memberSince', {
            date: new Date(child.createdAt).toLocaleDateString(),
          })}
        </Text>

        {actionError ? <ErrorState message={actionError} /> : null}

        <Button onPress={handleSave} loading={saving} disabled={displayName.trim().length === 0}>
          {tr('noe.children.save')}
        </Button>
      </Card>

      <Button variant="danger" onPress={handleDelete}>
        {tr('noe.children.deleteChild')}
      </Button>
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
  card: {
    ...shadows.sm,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarHint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
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
  memberSince: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
