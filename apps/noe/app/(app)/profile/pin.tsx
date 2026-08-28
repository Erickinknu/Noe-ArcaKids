import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { pinService } from '@/features/pin/services/pin-service';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const PIN_LENGTH = 4;
const WEAK_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];

type ScreenMode = 'loading' | 'create' | 'verify-old' | 'create-new' | 'done';

export default function PinScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
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
      return 'No uses combinaciones simples como "1234" o a&ntilde;os de nacimiento. Se pueden adivinar f&aacute;cilmente.';
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
      await pinService.createPin(pin);
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
      const updated = await pinService.updatePin(oldPin, pin);
      if (!updated) {
        setError('PIN anterior incorrecto');
        return;
      }
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

      <Card>
        <Text style={styles.description}>
          {mode === 'verify-old'
            ? 'Ingresa el PIN actual para poder cambiarlo.'
            : mode === 'create-new'
            ? 'Ingresa el nuevo PIN que usarás para desbloquear el teléfono del niño.'
            : 'El código PIN se utiliza para desbloquear el teléfono del niño. Solo puede ser modificado desde NOE (la app del padre).'}
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
            No uses combinaciones simples como &quot;1234&quot; o un a&ntilde;o de nacimiento. Dicho c&oacute;digo se puede descifrar f&aacute;cilmente.
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
        Vinculado directamente a ArcaKids. El PIN se sincroniza con el dispositivo
        del niño automáticamente.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSizes.caption,
    color: '#92400e',
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
