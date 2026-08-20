import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/services/auth-service';
import { ROUTES } from '@/constants';
import { colors, spacing, typography, t } from '@noe-arcakids/shared';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardScreen() {
  const { t: tr } = useTranslation();
  const user = useAuthStore((state) => state.user);

  async function handleSignOut() {
    await authService.signOut();
  }

  return (
    <PlaceholderScreen
      title={tr('noe.dashboard.title')}
      description={
        user
          ? `${tr('noe.dashboard.signedInAs', {
              email: user.email ?? t('common.unknownUser'),
            })} ${tr('noe.dashboard.description')}`
          : tr('noe.dashboard.description')
      }
    >
      <View style={styles.links}>
        <Link href={ROUTES.children} style={styles.link}>
          {tr('noe.dashboard.children')}
        </Link>
        <Link href={ROUTES.linking} style={styles.link}>
          {tr('noe.dashboard.linkDevice')}
        </Link>
        <Link href={ROUTES.activity} style={styles.link}>
          {tr('noe.dashboard.activity')}
        </Link>
        <Link href={ROUTES.settings} style={styles.link}>
          {tr('noe.dashboard.settings')}
        </Link>
        <Link href={ROUTES.profile} style={styles.link}>
          {tr('noe.dashboard.profile')}
        </Link>
      </View>
      <Button variant="outline" onPress={handleSignOut}>
        {tr('noe.dashboard.signOut')}
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