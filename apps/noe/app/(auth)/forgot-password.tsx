import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { errorMessage, colors, spacing, typography } from '@noe-arcakids/shared';

export default function ForgotPasswordScreen() {
  const { t: tr } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await authService.resetPasswordForEmail(email);
      setMessage(tr('noe.forgotPassword.sent'));
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
        <Text style={styles.title}>{tr('noe.forgotPassword.title')}</Text>
        <Text style={styles.subtitle}>
          {tr('noe.forgotPassword.subtitle')}
        </Text>
      </View>
      <Input
        label={tr('noe.forgotPassword.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={tr('noe.forgotPassword.emailPlaceholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button onPress={handleSubmit} loading={submitting}>
        {tr('noe.forgotPassword.send')}
      </Button>
      <Link href="/(auth)/login" style={styles.link}>
        {tr('noe.forgotPassword.back')}
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  message: {
    color: colors.success,
    fontSize: typography.fontSizes.caption,
  },
  link: {
    color: colors.primary,
    fontSize: typography.fontSizes.subtitle,
    textAlign: 'center',
  },
});