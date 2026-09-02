import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { authService } from '@/features/auth/services/auth-service';
import { Input, errorMessage, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';
import { ROUTES } from '@/constants';

/**
 * Password reset screen reached via the `noe://reset-password` deep link.
 *
 * Supabase sends an email with a recovery link that redirects back to the app
 * carrying a code. Expo Router + Supabase Auth handle exchanging that code for
 * a PASSWORD_RECOVERY session automatically via the auth state change listener.
 * From here the user just sets a new password, which updates their account.
 */
export default function ResetPasswordScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (password !== confirm) {
      setError(tr('noe.resetPassword.mismatch'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await authService.updatePassword(password);
      await authService.signOut();
      router.replace(ROUTES.login);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }, [password, confirm, router, tr]);

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>{tr('noe.resetPassword.title')}</Text>
        <Text style={styles.subtitle}>
          {tr('noe.resetPassword.subtitle')}
        </Text>
      </View>
      <Input
        label={tr('noe.resetPassword.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={tr('noe.resetPassword.passwordPlaceholder')}
      />
      <Input
        label={tr('noe.resetPassword.confirm')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder={tr('noe.resetPassword.confirmPlaceholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        onPress={handleSubmit}
        loading={submitting}
        disabled={!password || !confirm}
      >
        {tr('noe.resetPassword.submit')}
      </Button>
      <Text style={styles.hint}>{tr('noe.resetPassword.hint')}</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: typography.fontSizes.caption,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.fontSizes.caption,
    textAlign: 'center',
  },
});
