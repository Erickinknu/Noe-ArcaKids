import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { familyInviteService } from '@/features/family-invites/services/family-invite-service';
import { Button } from '@/components/ui/button';
import { Card, Input, useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function UnirmeScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(() => String(params.code ?? '').trim().toUpperCase());
  const [joining, setJoining] = useState(false);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      const { familyName } = await familyInviteService.redeemInvite(code);
      Alert.alert(tr('noe.familyInvites.unirmeTitle'), tr('noe.familyInvites.joinSuccess', { family: familyName }), [
        { text: 'OK', onPress: () => router.replace('/(app)') },
      ]);
    } catch (cause) {
      const message = cause && typeof cause === 'object' && 'message' in cause
        ? String((cause as { message: unknown }).message)
        : tr('noe.familyInvites.joinError');
      Alert.alert(tr('noe.familyInvites.unirmeTitle'), message);
    } finally {
      setJoining(false);
    }
  }, [code, router, tr]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={({ pressed }) => [styles.headerRow, pressed && styles.pressed]} onPress={() => router.replace('/profile')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>{tr('noe.familyInvites.unirmeTitle')}</Text>
        </Pressable>

        <Card>
          <Text style={styles.subtitle}>{tr('noe.familyInvites.unirmeSubtitle')}</Text>
          <Text style={styles.label}>{tr('noe.familyInvites.codeLabel')}</Text>
          <Input
            value={code}
            onChangeText={(text) => setCode(text.trim().toUpperCase().slice(0, 6))}
            placeholder={tr('noe.familyInvites.codePlaceholder')}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            onPress={handleJoin}
            loading={joining}
            disabled={code.length < 6}
            style={{ marginTop: spacing.md }}
          >
            {tr('noe.familyInvites.unirmeButton')}
          </Button>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: ThemeColors) =>
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
    pressed: {
      opacity: 0.6,
    },
    headerTitle: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    subtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      lineHeight: 22,
      marginBottom: spacing.md,
    },
    label: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
  });