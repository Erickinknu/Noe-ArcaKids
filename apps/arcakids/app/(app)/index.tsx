import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function HomeScreen() {
  const { isOnline } = useNetworkStatus();

  return (
    <PlaceholderScreen
      title="Kid app"
      description="Home, profile, activity and settings arrive in Phase 2."
    >
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Connection:</Text>
        <Text style={[styles.statusValue, isOnline ? styles.online : styles.offline]}>
          {isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>
      <View style={styles.links}>
        <Link href="/profile" style={styles.link}>
          Profile
        </Link>
        <Link href="/activity" style={styles.link}>
          Activity
        </Link>
        <Link href="/settings" style={styles.link}>
          Settings
        </Link>
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
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
  links: {
    gap: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
});