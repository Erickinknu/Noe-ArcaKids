import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui/button';
import { colors, typography } from '@noe-arcakids/shared';

export default function OnboardingScreen() {
  return (
    <PlaceholderScreen
      title="ARCA KIDS"
      description="Onboarding and device linking arrive in Phase 3. This is a placeholder screen."
    >
      <Link href="/(app)" style={styles.link} asChild>
        <Button variant="outline">Continue to the app</Button>
      </Link>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary,
    fontSize: typography.fontSizes.body,
    textAlign: 'center',
  },
});