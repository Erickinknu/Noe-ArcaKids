import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { identityService } from '@/features/identity/services/identity-service';
import type { ChildInfo } from '@/features/identity/repositories/identity-repository';
import { errorMessage, useAsyncData } from '@/hooks/use-async-data';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄'];

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleLoaded = useCallback((info: ChildInfo) => {
    setName(info.name);
    setAvatar(info.avatar);
  }, []);
  const fetchInfo = useCallback(async () => {
    const info = await identityService.getChildInfo();
    return info ?? { name: '', avatar: AVATARS[0] };
  }, []);
  const { error, loading, reload } = useAsyncData(fetchInfo, handleLoaded);

  async function handleSave() {
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await identityService.saveChildInfo({ name, avatar });
      setSaved(true);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.muted}>Loading your profile...</Text>
      </View>
    );
  }

  if (error) {
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
      <Card>
        <Text style={styles.avatarPreview}>{avatar}</Text>
        <Input label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <Text style={styles.cardTitle}>Pick your buddy</Text>
        <View style={styles.avatarRow}>
          {AVATARS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setAvatar(item)}
              style={[styles.avatarOption, item === avatar && styles.avatarSelected]}
            >
              <Text style={styles.avatarEmoji}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Button onPress={handleSave} loading={saving}>
          Save
        </Button>
        {saved ? <Text style={styles.message}>Saved!</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </Card>
      <Text style={styles.muted}>
        This device is not linked to a family yet — linking arrives in a later phase.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
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
    marginTop: spacing.sm,
  },
  avatarPreview: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarOption: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  message: {
    color: colors.success,
    fontSize: typography.fontSizes.caption,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
});