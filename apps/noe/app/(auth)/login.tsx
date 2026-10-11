import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Image, Dimensions, Pressable } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/services/auth-service';
import { familyInviteService } from '@/features/family-invites/services/family-invite-service';
import { useAuthStore } from '@/stores/auth-store';
import { Input, errorMessage, networkService, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';
import { ROUTES, LAST_EMAIL_KEY } from '@/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 360;
const IS_LARGE_SCREEN = SCREEN_WIDTH > 400;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

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
  const { code } = useLocalSearchParams<{ code?: string }>();
  const status = useAuthStore((state) => state.status);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    AsyncStorage.getItem(LAST_EMAIL_KEY)
      .then((value) => {
        if (value) setEmail(value);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(ROUTES.app);
    }
  }, [status, router]);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remaining = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLocked = remaining > 0;

  async function handleSubmit() {
    if (isLocked) return;
    if (!networkService.isOnline()) {
      setError(tr('noe.login.offline'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.signIn({ email, password });
      await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase()).catch(() => {});
      if (code && code.trim().length > 0) {
        await familyInviteService.redeemInvite(code.trim()).catch(() => {});
      }
      setFailedAttempts(0);
    } catch (cause) {
      const raw = errorMessage(cause);
      if (/network|fetch|connection|timeout|internet/i.test(raw)) {
        setError(tr('noe.login.offline'));
      } else {
        const next = failedAttempts + 1;
        if (next >= MAX_FAILED_ATTEMPTS) {
          setNow(Date.now());
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setFailedAttempts(0);
          setError(tr('noe.login.tooManyAttempts', { seconds: Math.ceil(LOCKOUT_MS / 1000) }));
        } else {
          setFailedAttempts(next);
          setError(
            `${tr('noe.login.invalidCredentials')} ${tr('noe.login.attemptsLeft', {
              count: MAX_FAILED_ATTEMPTS - next,
            })}`
          );
        }
      }
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
      <View style={styles.passwordWrap}>
        <Input
          label={tr('noe.login.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder={tr('noe.login.passwordPlaceholder')}
          style={styles.passwordInput}
          editable={!isLocked}
        />
        <Pressable style={styles.eye} onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
          <MaterialIcons
            name={showPassword ? 'visibility-off' : 'visibility'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      {isLocked ? (
        <Text style={styles.error}>
          {tr('noe.login.tooManyAttempts', { seconds: remaining })}
        </Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button onPress={handleSubmit} loading={submitting} disabled={isLocked} size="lg">
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
  passwordWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eye: {
    position: 'absolute',
    right: spacing.md,
    top: 34,
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