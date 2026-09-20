import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import {
  Card,
  useTheme,
  radius,
  spacing,
  typography,
  type ThemeColors,
} from '@noe-arcakids/shared';
import { familyPinService } from '@/features/family-pin/services/family-pin-service';

const PIN_LENGTH = 4;

type GateStatus = 'loading' | 'open' | 'locked';

interface ParentalPinGateProps {
  children: ReactNode;
  variant?: 'screen' | 'card';
}

/**
 * Locks sensitive content behind the family PIN. If no PIN is configured in
 * NOE yet the content is shown as-is; once configured, the gate stays locked
 * until the correct PIN is entered (checked against the hash synced from NOE).
 */
export function ParentalPinGate({ children, variant = 'screen' }: ParentalPinGateProps) {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [status, setStatus] = useState<GateStatus>('loading');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    familyPinService
      .hasPin()
      .then((has) => {
        if (mounted) setStatus(has ? 'locked' : 'open');
      })
      .catch(() => {
        if (mounted) setStatus('open');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== PIN_LENGTH) {
      setError(tr('arcakids.pinGate.incomplete'));
      return;
    }
    if (familyPinService.isLocked()) {
      setError(tr('arcakids.pinGate.locked'));
      setPin('');
      return;
    }
    const ok = await familyPinService.verifyPin(pin);
    if (ok) {
      setStatus('open');
      setPin('');
      setError(null);
    } else {
      setError(
        familyPinService.isLocked()
          ? tr('arcakids.pinGate.locked')
          : tr('arcakids.pinGate.wrongPin')
      );
      setPin('');
    }
  }, [pin, tr]);

  if (status !== 'locked') {
    return <>{children}</>;
  }

  const pinInput = (
    <>
      <TextInput
        style={styles.pinInput}
        value={pin}
        onChangeText={(text) => {
          setPin(text.replace(/\D/g, '').slice(0, PIN_LENGTH));
          setError(null);
          if (text.length === PIN_LENGTH) {
            void handleSubmit();
          }
        }}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        secureTextEntry
        autoFocus={variant === 'screen'}
        placeholder="••••"
        placeholderTextColor={colors.textMuted}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );

  if (variant === 'card') {
    return (
      <Card>
        <View style={styles.cardHeader}>
          <MaterialIcons name="lock" size={22} color={colors.primary} />
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>{tr('arcakids.pinGate.title')}</Text>
            <Text style={styles.cardSubtitle}>{tr('arcakids.pinGate.description')}</Text>
          </View>
        </View>
        {pinInput}
      </Card>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.screenContent}>
        <MaterialIcons name="lock" size={40} color={colors.primary} />
        <Text style={styles.title}>{tr('arcakids.pinGate.title')}</Text>
        <Text style={styles.subtitle}>{tr('arcakids.pinGate.description')}</Text>
        <View style={styles.screenInput}>{pinInput}</View>
        <View style={styles.hintBox}>
          <MaterialIcons name="info" size={18} color={colors.textMuted} />
          <Text style={styles.hint}>{tr('arcakids.pinGate.hint')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    screenContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    screenInput: {
      alignSelf: 'stretch',
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
    error: {
      fontSize: typography.fontSizes.caption,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    hintBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    hint: {
      flex: 1,
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
  });