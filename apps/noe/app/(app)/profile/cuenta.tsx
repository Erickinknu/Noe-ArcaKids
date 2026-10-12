import { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { authService } from '@/features/auth/services/auth-service';
import { accountService } from '@/features/account/services/account-service';
import { analyticsService } from '@/features/analytics/services/analytics-service';
import { familyService } from '@/features/family/services/family-service';
import { profileService } from '@/features/profile/services/profile-service';
import type { MyFamily } from '@/features/family/repositories/family-repository';
import { Card, Input, errorMessage, networkService, useAsyncData, useTheme, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

export default function CuentaScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [delPassword, setDelPassword] = useState('');
  const [delWord, setDelWord] = useState('');
  const [delSaving, setDelSaving] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);
  const [delDone, setDelDone] = useState(false);

  const fetchFamily = useCallback(() => familyService.getMyFamily(), []);
  const handleLoaded = useCallback((result: MyFamily) => {
    setDisplayName(result.profile.displayName || '');
  }, []);
  const { data, error, loading, reload } = useAsyncData(fetchFamily, handleLoaded);

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    setActionError(null);
    setSavedFlash(false);
    try {
      await profileService.updateDisplayName(data.profile.id, displayName);
      await reload();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  // Borrado de cuenta (spec §10): exige contraseña + palabra de confirmación.
  async function handleDeleteAccount() {
    setDelError(null);
    const confirmWord = tr('noe.accountDeletion.confirmWord');
    if (delWord.trim() !== confirmWord) {
      setDelError(tr('noe.accountDeletion.mismatch', { word: confirmWord }));
      return;
    }
    if (!delPassword) {
      setDelError(tr('noe.accountDeletion.wrongPassword'));
      return;
    }
    if (!networkService.isOnline()) {
      setDelError(tr('noe.accountDeletion.offline'));
      return;
    }
    setDelSaving(true);
    try {
      const ok = await authService.verifyPassword(delPassword);
      if (!ok) {
        setDelError(tr('noe.accountDeletion.wrongPassword'));
        return;
      }
      await accountService.deleteAccount();
      analyticsService.track('account_deleted');
      try {
        await authService.signOut();
      } catch {}
      setDelPassword('');
      setDelWord('');
      setDelDone(true);
      router.replace('/(auth)/login');
    } catch (cause) {
      setDelError(errorMessage(cause) || tr('noe.accountDeletion.error'));
    } finally {
      setDelSaving(false);
    }
  }

  if (loading) return <View style={styles.screen}><LoadingState text="Cargando..." /></View>;
  if (error && !data) return <View style={styles.screen}><ErrorState message={error} onRetry={reload} /></View>;

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Perfil</Text>
      </Pressable>

      <Card style={styles.avatarCard}>
        <Avatar name={data?.profile.displayName || ''} size={72} />
        <Text style={styles.email}>{data?.profile.email || '—'}</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Nombre</Text>
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Tu nombre"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Correo electrónico</Text>
        <Text style={styles.value}>{data?.profile.email || '—'}</Text>
        <Text style={styles.hint}>El correo no se puede modificar desde aquí.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Familia</Text>
        <Text style={styles.value}>{data?.family.name || '—'}</Text>
      </Card>

      <Button onPress={handleSave} loading={saving}>
        {savedFlash ? 'Guardado ✓' : 'Guardar cambios'}
      </Button>

      {actionError ? <ErrorState message={actionError} /> : null}

      <Card style={styles.card}>
        <Text style={styles.dangerTitle}>{tr('noe.accountDeletion.title')}</Text>
        {delDone ? (
          <Text style={styles.dangerDone}>{tr('noe.accountDeletion.done')}</Text>
        ) : (
          <>
            <Text style={styles.dangerWarning}>{tr('noe.accountDeletion.warning')}</Text>
            <Input
              label={tr('noe.accountDeletion.passwordLabel')}
              value={delPassword}
              onChangeText={(value) => {
                setDelPassword(value);
                setDelError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              placeholder={tr('noe.accountDeletion.passwordPlaceholder')}
            />
            <Input
              label={tr('noe.accountDeletion.typeLabel', {
                word: tr('noe.accountDeletion.confirmWord'),
              })}
              value={delWord}
              onChangeText={(value) => {
                setDelWord(value);
                setDelError(null);
              }}
              autoCapitalize="characters"
              placeholder={tr('noe.accountDeletion.confirmWord')}
            />
            {delError ? <Text style={styles.dangerError}>{delError}</Text> : null}
            <Button variant="danger" onPress={handleDeleteAccount} loading={delSaving}>
              {tr('noe.accountDeletion.submit')}
            </Button>
          </>
        )}
      </Card>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  card: {
    ...shadows.sm,
  },
  avatarCard: {
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.sm,
  },
  email: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  hint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  dangerTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.danger,
  },
  dangerWarning: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  dangerError: {
    fontSize: typography.fontSizes.caption,
    color: colors.danger,
  },
  dangerDone: {
    fontSize: typography.fontSizes.body,
    color: colors.success,
  },
});
