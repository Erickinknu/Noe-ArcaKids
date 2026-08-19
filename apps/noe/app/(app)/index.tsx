import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/services/auth-service';
import { colors, spacing, typography } from '@noe-arcakids/shared';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user);

  async function handleSignOut() {
    await authService.signOut();
  }

  return (
    <PlaceholderScreen
      title="Parent dashboard"
      description={
        user
          ? `Signed in as ${user.email ?? 'unknown user'}. Children, activity, settings and profile arrive in Phase 1.`
          : 'Children, activity, settings and profile arrive in Phase 1.'
      }
    >
      <View style={styles.links}>
        <Link href="/children" style={styles.link}>
          Children
        </Link>
        <Link href="/activity" style={styles.link}>
          Activity
        </Link>
        <Link href="/settings" style={styles.link}>
          Settings
        </Link>
        <Link href="/profile" style={styles.link}>
          Profile
        </Link>
      </View>
      <Button variant="outline" onPress={handleSignOut}>
        Sign out
      </Button>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
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