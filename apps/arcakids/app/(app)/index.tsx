import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useAsyncData } from '@/hooks/use-async-data';
import { identityService } from '@/features/identity/services/identity-service';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function HomeScreen() {
  const { isOnline } = useNetworkStatus();
  const { data: childInfo } = useAsyncData(
    () => identityService.getChildInfo()
  );

  const name = childInfo?.name?.split(' ')[0] ?? 'kid';
  const avatar = childInfo?.avatar ?? '🧸';

  return (
    <View style={styles.screen}>
      <Text style={styles.avatar}>{avatar}</Text>
      <Text style={styles.title}>Hi, {name}!</Text>
      <Text style={styles.subtitle}>What do you want to do today?</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, isOnline ? styles.online : styles.offline]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>
      <View style={styles.cards}>
        <Link href="/activity" asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>⭐</Text>
            <Text style={styles.cardTitle}>Activity</Text>
            <Text style={styles.cardSubtitle}>Your day in one place</Text>
          </Card>
        </Link>
        <Link href="/profile" asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>🧒</Text>
            <Text style={styles.cardTitle}>Profile</Text>
            <Text style={styles.cardSubtitle}>Your buddy and name</Text>
          </Card>
        </Link>
        <Link href="/settings" asChild>
          <Card style={styles.card}>
            <Text style={styles.cardEmoji}>⚙️</Text>
            <Text style={styles.cardTitle}>Settings</Text>
            <Text style={styles.cardSubtitle}>App preferences</Text>
          </Card>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  avatar: {
    fontSize: 56,
    textAlign: 'center',
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  statusLabel: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
  },
  statusValue: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
  },
  online: {
    color: colors.success,
  },
  offline: {
    color: colors.danger,
  },
  cards: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardEmoji: {
    fontSize: 32,
  },
  cardTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cardSubtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
});