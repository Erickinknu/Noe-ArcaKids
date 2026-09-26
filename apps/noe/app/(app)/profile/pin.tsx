import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { pinService } from '@/features/pin/services/pin-service';
import { pinSyncService } from '@/features/pin/services/pin-sync-service';
import { Card, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

const PIN_LENGTH = 4;
const WEAK_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];

type ScreenMode = 'loading' | 'create' | 'verify-old' | 'create-new' | 'done';

export default function PinScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [mode, setMode] = useState<ScreenMode>('loading');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pinService.isEnabled().then((enabled) => {
      setMode(enabled ? 'verify-old' : 'create');
    });
  }, []);

  function validate(newPin: string): string | null {
    if (newPin.length !== PIN_LENGTH) {
      return `El PIN debe tener exactamente ${PIN_LENGTH} dígitos`;
    }
    if (!/^\d+$/.test(newPin)) {
      return 'El PIN solo puede contener números';
    }
    if (WEAK_PINS.includes(newPin)) {
      return 'No uses combinaciones simples como "1234" o años de nacimiento. Se pueden adivinar fácilmente.';
    }
    return null;
  }

  async function handleVerifyOld() {
    setError(null);
    if (oldPin.length !== PIN_LENGTH) {
      setError('Ingresa el PIN actual');
      return;
    }
    setSaving(true);
    try {
      const valid = await pinService.verifyPin(oldPin);
      if (!valid) {
        setError('PIN incorrecto');
        return;
      }
      setMode('create-new');
      setOldPin('');
    } catch (cause: any) {
      setError(cause?.message ?? 'Error al verificar el PIN');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    setError(null);
    setSavedFlash(false);

    const validationError = validate(pin);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (pin !== confirmPin) {
      setError('Los PIN no coinciden');
      return;
    }

    setSaving(true);
    try {
      const config = await pinService.createPin(pin);
      await pinSyncService.pushPinToFamily(config.salt, config.pinHash);
      setSavedFlash(true);
      setMode('done');
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (cause: any) {
      setError(cause?.message ?? 'Error al guardar el PIN');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateNew() {
    setError(null);
    setSavedFlash(false);

    const validationError = validate(pin);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (pin !== confirmPin) {
      setError('Los PIN no coinciden');
      return;
    }

    setSaving(true);
    try {
      const config = await pinService.updatePin(oldPin, pin);
      if (!config) {
        setError('PIN anterior incorrecto');
        return;
      }
      await pinSyncService.pushPinToFamily(config.salt, config.pinHash);
      setSavedFlash(true);
      setMode('done');
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (cause: any) {
      setError(cause?.message ?? 'Error al actualizar el PIN');
    } finally {
      setSaving(false);
    }
  }

  if (mode === 'loading') {
    return (
      <View style={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Código PIN</Text>
      </Pressable>

      <Card style={styles.card}>
        <Text style={styles.description}>
          {mode === 'verify-old'
            ? 'Ingresa el PIN actual para poder cambiarlo.'
            : mode === 'create-new'
            ? 'Ingresa el nuevo PIN que usarás para desbloquear NOE.'
            : 'El código PIN protege el acceso a NOE (la app del padre) y las funciones sensibles de ARCA KIDS (configuración, perfil y vinculación).'}
        </Text>

        {mode === 'verify-old' && (
          <>
            <Text style={styles.label}>PIN actual ({PIN_LENGTH} dígitos)</Text>
            <TextInput
              style={styles.pinInput}
              value={oldPin}
              onChangeText={(t) => setOldPin(t.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {(mode === 'create' || mode === 'create-new') && (
          <>
            <Text style={styles.label}>Nuevo PIN ({PIN_LENGTH} dígitos)</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Confirmar PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={confirmPin}
              onChangeText={(t) => setConfirmPin(t.replace(/\D/g, '').slice(0, PIN_LENGTH))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {mode === 'done' && (
          <View style={styles.successBox}>
            <MaterialIcons name="check-circle" size={48} color={colors.success} />
            <Text style={styles.successText}>PIN guardado correctamente</Text>
          </View>
        )}

        <View style={styles.warningBox}>
          <MaterialIcons name="warning" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            No uses combinaciones simples como “1234” o un año de nacimiento. Dicho código se puede descifrar fácilmente.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {mode === 'verify-old' && (
          <Button onPress={handleVerifyOld} loading={saving}>
            Verificar PIN
          </Button>
        )}

        {mode === 'create' && (
          <Button onPress={handleCreate} loading={saving}>
            {savedFlash ? 'Guardado ✓' : 'Crear PIN'}
          </Button>
        )}

        {mode === 'create-new' && (
          <Button onPress={handleUpdateNew} loading={saving}>
            {savedFlash ? 'Guardado ✓' : 'Actualizar PIN'}
          </Button>
        )}
      </Card>

      <Text style={styles.hint}>
        Tu PIN se guarda de forma segura y se comparte (encriptado) con los
        dispositivos de tu familia para proteger las secciones sensibles de
        ARCA KIDS. Puedes activar “Bloqueo con PIN al abrir NOE” desde
        Configuración de la app.
      </Text>
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
  card: {
    ...shadows.sm,
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
  description: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 24,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    backgroundColor: colors.background,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: colors.warning,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSizes.caption,
    color: colors.danger,
  },
  successBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  successText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.success,
  },
  hint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadingText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
