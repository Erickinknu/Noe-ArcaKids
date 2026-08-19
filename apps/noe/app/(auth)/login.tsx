import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/features/auth/services/auth-service';
import { AppError, colors, spacing, typography } from '@noe-arcakids/shared';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await authService.signIn({ email, password });
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
        <Text style={styles.title}>NOE</Text>
        <Text style={styles.subtitle}>Parent app</Text>
      </View>
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
      <Button onPress={handleSubmit} loading={submitting}>
        Sign in
      </Button>
      <View style={styles.links}>
        <Link href="/(auth)/register" style={styles.link}>
          Create account
        </Link>
        <Link href="/(auth)/forgot-password" style={styles.link}>
          Forgot password?
        </Link>
      </View>
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
    fontSize: typography.fontSizes.display,
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
  links: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  link: {
    color: colors.primary,
    fontSize: typography.fontSizes.subtitle,
  },
});