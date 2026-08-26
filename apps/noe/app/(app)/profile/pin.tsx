import { useState } from 'react';
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
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const PIN_LENGTH = 4;
const WEAK_PINS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];

export default function PinScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSave() {
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
      // TODO: Call PIN service linked to ArcaKids
      await new Promise((r) => setTimeout(r, 800));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (cause: any) {
      setError(cause?.message ?? 'Error al guardar el PIN');
    } finally {
      setSaving(false);
    }
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
          El código PIN se utiliza para desbloquear el teléfono del niño. Solo puede
          ser modificado desde NOE (la app del padre).
        </Text>

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

        <View style={styles.warningBox}>
          <MaterialIcons name="warning" size={18} color={colors.warning} />
          <Text style={styles.warningText}>
            No uses combinaciones simples como "1234" o un año de nacimiento. Dicho
            código se puede descifrar fácilmente.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <MaterialIcons name="error" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Button onPress={handleSave} loading={saving}>
          {savedFlash ? 'Guardado ✓' : 'Guardar PIN'}
        </Button>
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
  hint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
