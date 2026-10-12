import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { PasswordStrength } from '@/components/ui/password-strength';
import { authService } from '@/features/auth/services/auth-service';
import { analyticsService } from '@/features/analytics/services/analytics-service';
import { billingService } from '@/features/billing/services/billing-service';
import { familyService } from '@/features/family/services/family-service';
import { familyInviteService } from '@/features/family-invites/services/family-invite-service';
import {
  Input,
  isValidEmail,
  validatePassword,
  errorMessage,
  useTheme,
  spacing,
  typography,
  type ThemeColors,
} from '@noe-arcakids/shared';
import { LAST_EMAIL_KEY, SETUP_PENDING_KEY } from '@/constants';

const TERMS_VERSION = '2026-10-v1';
const TERMS_ACCEPTANCE_KEY = 'noe_terms_acceptance';

export default function RegisterScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { plan, code } = useLocalSearchParams<{ plan?: string; code?: string }>();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailValid = email.length === 0 || isValidEmail(email);
  const passwordIssue = password.length === 0 ? null : validatePassword(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const canSubmit =
    displayName.trim().length > 0 &&
    isValidEmail(email) &&
    !passwordIssue &&
    password.length > 0 &&
    confirm === password &&
    acceptTerms &&
    isAdult &&
    !submitting;

  async function handleSubmit() {
    if (!acceptTerms) {
      setError(tr('noe.register.acceptTermsRequired'));
      return;
    }
    if (!isAdult) {
      setError(tr('noe.register.adultRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setError(tr('noe.register.invalidEmail'));
      return;
    }
    if (passwordIssue) {
      setError(passwordIssue);
      return;
    }
    if (confirm !== password) {
      setError(tr('noe.register.mismatch'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await authService.signUp({ email, password, displayName });

      // Registro local de la aceptación (versión de documento + fecha).
      try {
        await AsyncStorage.setItem(
          TERMS_ACCEPTANCE_KEY,
          JSON.stringify({ version: TERMS_VERSION, acceptedAt: new Date().toISOString(), email })
        );
        await AsyncStorage.setItem(LAST_EMAIL_KEY, email.trim().toLowerCase());
        await AsyncStorage.setItem(SETUP_PENDING_KEY, 'true');
      } catch {
        // el registro de aceptación no debe bloquear el alta
      }

      // Si vino con código de invitación, se une al hogar existente.
      let redeemed = false;
      if (code && code.trim().length > 0) {
        try {
          await familyInviteService.redeemInvite(code.trim());
          redeemed = true;
        } catch {
          // el código inválido/expirado se gestiona en la pantalla de unirse
        }
      }

      analyticsService.track('signup_completed', { withInvite: redeemed });
      if (redeemed) {
        analyticsService.track('invite_redeemed');
      }

      // Plan Gratis por defecto (best-effort) y nombre del grupo (best-effort).
      try {
        await billingService.claimPlan('free');
      } catch {
        // puede fallar si aún no hay sesión (confirmación por correo)
      }
      if (!code && groupName.trim().length > 0) {
        try {
          const myFamily = await familyService.getMyFamily();
          if (myFamily.family.id) {
            await familyService.renameFamily(myFamily.family.id, groupName.trim());
          }
        } catch {
          // el nombre del grupo se puede ajustar luego
        }
      }

      setMessage(tr('noe.register.checkEmail'));
      router.replace('/(app)');
    } catch (cause) {
      const raw = errorMessage(cause);
      if (/already registered|already exists|ya est/i.test(raw)) {
        setError(tr('noe.register.emailTaken'));
      } else {
        setError(raw);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
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
        error={!emailValid ? tr('noe.register.invalidEmail') : null}
      />

      <PasswordField
        label={tr('noe.register.password')}
        placeholder={tr('noe.register.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        visible={showPassword}
        onToggle={() => setShowPassword((v) => !v)}
        error={passwordIssue}
        colors={colors}
        styles={styles}
      />
      <PasswordStrength password={password} />

      <PasswordField
        label={tr('noe.register.confirmPassword')}
        placeholder={tr('noe.register.confirmPlaceholder')}
        value={confirm}
        onChangeText={setConfirm}
        visible={showConfirm}
        onToggle={() => setShowConfirm((v) => !v)}
        error={mismatch ? tr('noe.register.mismatch') : null}
        colors={colors}
        styles={styles}
      />

      <Input
        label={tr('noe.register.groupName')}
        value={groupName}
        onChangeText={setGroupName}
        placeholder={tr('noe.register.groupPlaceholder')}
      />
      <Text style={styles.hint}>{tr('noe.register.groupHint')}</Text>

      <Pressable style={styles.checkRow} onPress={() => setAcceptTerms((v) => !v)}>
        <MaterialIcons
          name={acceptTerms ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={acceptTerms ? colors.primary : colors.textMuted}
        />
        <Text style={styles.checkText}>
          {tr('noe.register.termsPrefix')}{' '}
          <Text
            style={styles.linkInline}
            onPress={() => router.push('/(app)/profile/terminos')}
          >
            {tr('noe.register.termsLink')}
          </Text>{' '}
          {tr('noe.register.and')}{' '}
          <Text
            style={styles.linkInline}
            onPress={() => router.push('/(app)/profile/privacidad')}
          >
            {tr('noe.register.privacyLink')}
          </Text>
        </Text>
      </Pressable>

      <Pressable style={styles.checkRow} onPress={() => setIsAdult((v) => !v)}>
        <MaterialIcons
          name={isAdult ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={isAdult ? colors.primary : colors.textMuted}
        />
        <Text style={styles.checkText}>{tr('noe.register.adultLabel')}</Text>
      </Pressable>

      {plan === 'demo' ? <Text style={styles.planNote}>Cuenta de demostración.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Button onPress={handleSubmit} loading={submitting} disabled={!canSubmit}>
        {tr('noe.register.submit')}
      </Button>
      <Link href="/(auth)/login" style={styles.link}>
        {tr('noe.register.haveAccount')}
      </Link>
    </ScrollView>
  );
}

function PasswordField({
  label,
  placeholder,
  value,
  onChangeText,
  visible,
  onToggle,
  error,
  colors,
  styles,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  error?: string | null;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View>
      <View style={styles.passwordWrap}>
        <Input
          label={label}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          autoCapitalize="none"
          error={error}
          style={styles.passwordInput}
        />
        <Pressable style={styles.eye} onPress={onToggle} hitSlop={8}>
          <MaterialIcons
            name={visible ? 'visibility-off' : 'visibility'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
    </View>
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
    hint: {
      color: colors.textMuted,
      fontSize: typography.fontSizes.caption,
      marginTop: -spacing.sm,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    checkText: {
      flex: 1,
      color: colors.text,
      fontSize: typography.fontSizes.caption,
      lineHeight: 18,
    },
    linkInline: {
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
    error: {
      color: colors.danger,
      fontSize: typography.fontSizes.caption,
      textAlign: 'center',
    },
    message: {
      color: colors.success,
      fontSize: typography.fontSizes.caption,
      textAlign: 'center',
    },
    planNote: {
      color: colors.primary,
      fontSize: typography.fontSizes.caption,
      textAlign: 'center',
    },
    link: {
      color: colors.primary,
      fontSize: typography.fontSizes.subtitle,
      textAlign: 'center',
    },
  });
