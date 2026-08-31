import { useMemo, useState } from 'react';
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
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function SugerirScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [idea, setIdea] = useState('');
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!idea.trim()) return;
    setSent(true);
    setTimeout(() => {
      Alert.alert('Gracias', 'Tu idea ha sido enviada. ¡Nos encanta escuchar tus sugerencias!');
      router.replace('/(app)/profile');
    }, 500);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Sugiere una idea</Text>
      </Pressable>

      <Card>
        <Text style={styles.description}>
          ¿Tienes una idea para mejorar NOE? Cuéntanos y la evaluaremos para futuras
          versiones de la app.
        </Text>
        <TextInput
          style={styles.textArea}
          value={idea}
          onChangeText={setIdea}
          placeholder="Describe tu idea..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
        <Button onPress={handleSend} loading={sent} disabled={!idea.trim()}>
          Enviar idea
        </Button>
      </Card>
    </ScrollView>
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
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: typography.fontSizes.body,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 120,
    marginBottom: spacing.md,
  },
});