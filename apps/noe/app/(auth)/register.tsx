import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { AppError, colors, spacing, typography } from '@noe-arcakids/shared';

export default function RegisterScreen() {
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
      setMessage('Check your email to confirm your account, then sign in.');
    } catch (cause) {
      setError(
        cause instanceof AppError ? cause.message : 'Unexpected error. Please try again.'
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>NOE - parent app</Text>
      </View>
      <Input
        label="Name"
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        placeholder="Your name"
      />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Your password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Button onPress={handleSubmit} loading={submitting}>
        Create account
      </Button>
      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Sign in
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