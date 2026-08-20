import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { AppError, colors, spacing, typography, t } from '@noe-arcakids/shared';

export default function RegisterScreen() {
  const { t: tr } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await authService.signUp({ email, password, displayName });
      setMessage(tr('noe.register.checkEmail'));
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : t('common.unexpected')
      );
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
        <Text style={styles.title}>{tr('noe.register.title')}</Text>
        <Text style={styles.subtitle}>{tr('noe.register.subtitle')}</Text>
      </View>
      <Input
        label={tr('noe.register.name')}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        placeholder={tr('noe.register.namePlaceholder')}
      />
      <Input
        label={tr('noe.register.email')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder={tr('noe.register.emailPlaceholder')}
      />
      <Input
        label={tr('noe.register.password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder={tr('noe.register.passwordPlaceholder')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button onPress={handleSubmit} loading={submitting}>
        {tr('noe.register.submit')}
      </Button>
      <Link href="/(auth)/login" style={styles.link}>
        {tr('noe.register.haveAccount')}
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