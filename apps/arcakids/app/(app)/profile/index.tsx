import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { identityService } from '@/features/identity/services/identity-service';
import type { ChildInfo } from '@/features/identity/repositories/identity-repository';
import { useAchievements } from '@/features/achievements';
import { Card, Input, errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🐙', '🦄'];

export default function ProfileScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [linked, setLinked] = useState(false);

  const handleLoaded = useCallback((info: ChildInfo) => {
    setName(info.name);
    setAvatar(info.avatar);
    setLinked(Boolean(info.childId && info.familyId));
  }, []);
  const fetchInfo = useCallback(async () => {
    const info = await identityService.getChildInfo();
    return info ?? { name: '', avatar: AVATARS[0] };
  }, []);
  const { achievements } = useAchievements();
  const currentAchievement = achievements.find((a) => !a.isAchieved) ?? achievements[0];
  const { error, loading, reload, data } = useAsyncData(fetchInfo, handleLoaded);
  const childId = data?.childId;

  async function handleSave() {
    setSaving(true);
    setActionError(null);
    setSaved(false);
    try {
      await identityService.saveChildProfile({ name, avatar });
      setSaved(true);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.muted}>{tr('arcakids.profile.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.error}>{error}</Text>
        <Button variant="outline" onPress={reload}>
          {tr('common.retry')}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.headerBar}>
        <Text style={styles.title}>{tr('arcakids.profile.title')}</Text>
        <ThemeToggle />
      </View>

      {/* Achievement Progress Section */}
      {childId && currentAchievement && (
        <Card style={{ marginTop: spacing.md }}>
          <Text style={styles.cardTitle}>{currentAchievement.icon} {currentAchievement.title}</Text>
          <View style={styles.progressContainer}>
            <Text style={styles.progressName}>Progreso</Text>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${currentAchievement.percentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressPercentage}>
              {currentAchievement.percentage}%
            </Text>
            {currentAchievement.isAchieved ? (
              <Text style={styles.progressCompleted}>¡Logrado!</Text>
            ) : null}
          </View>
        </Card>
      )}

      <Card>
        <Text style={styles.avatarPreview}>{avatar}</Text>
        <Input
          label={tr('arcakids.profile.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={tr('arcakids.profile.namePlaceholder')}
        />
        <Text style={styles.cardTitle}>{tr('arcakids.profile.pickBuddy')}</Text>
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
          {tr('arcakids.profile.save')}
        </Button>
        {saved ? <Text style={styles.message}>{tr('arcakids.profile.saved')}</Text> : null}
        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
      </Card>
      <Text style={styles.muted}>
        {linked ? tr('arcakids.profile.linked') : tr('arcakids.profile.notLinked')}
      </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
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
  progressContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  progressName: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressPercentage: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  progressCompleted: {
    color: colors.success,
    fontSize: typography.fontSizes.caption,
  },
});