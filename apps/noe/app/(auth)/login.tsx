import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image, Dimensions } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';
import { ROUTES } from '@/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 360;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 400;

const RESPONSIVE = {
  logoSize: IS_SMALL_SCREEN ? 72 : IS_LARGE_SCREEN ? 96 : 88,
  logoRadius: IS_SMALL_SCREEN ? 18 : IS_LARGE_SCREEN ? 24 : 22,
  horizontalPadding: IS_SMALL_SCREEN ? spacing.md : IS_LARGE_SCREEN ? spacing.xl : spacing.lg,
  titleSize: IS_SMALL_SCREEN ? typography.fontSizes.heading : IS_LARGE_SCREEN ? typography.fontSizes.display + 4 : typography.fontSizes.display,
  bodySize: IS_SMALL_SCREEN ? typography.fontSizes.body - 1 : IS_LARGE_SCREEN ? typography.fontSizes.body + 1 : typography.fontSizes.body,
  gap: IS_SMALL_SCREEN ? spacing.sm : IS_LARGE_SCREEN ? spacing.lg : spacing.md,
} as const;

export default function LoginScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(ROUTES.app);
    }
  }, [status, router]);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await authService.signIn({ email, password });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Image
          source={require('@/assets/images/noe-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>{tr('noe.login.subtitle')}</Text>
      </View>
      <Input
        label={tr('noe.login.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={tr('noe.login.emailPlaceholder')}
      />
      <Input
        label={tr('noe.login.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={tr('noe.login.passwordPlaceholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={handleSubmit} loading={submitting} size="lg">
        {tr('noe.login.signIn')}
      </Button>
      <View style={styles.links}>
        <Link href="/(auth)/register" style={styles.link}>
          {tr('noe.login.createAccount')}
        </Link>
        <Link href="/(auth)/forgot-password" style={styles.link}>
          {tr('noe.login.forgotPassword')}
        </Link>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: RESPONSIVE.horizontalPadding,
    paddingVertical: spacing.lg,
    backgroundColor: colors.background,
    gap: RESPONSIVE.gap,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  logo: {
    width: RESPONSIVE.logoSize,
    height: RESPONSIVE.logoSize,
    borderRadius: RESPONSIVE.logoRadius,
  },
  subtitle: {
    fontSize: RESPONSIVE.bodySize,
    color: colors.textMuted,
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
  links: {
    gap: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  link: {
    color: colors.primary,
    fontSize: typography.fontSizes.subtitle,
  },
});