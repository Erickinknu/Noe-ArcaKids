import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <MaterialIcons name="shield-moon" size={56} color={colors.primary} />
        <Text style={styles.title}>¡Te damos la bienvenida a NOE!</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryText}>Crear mi cuenta</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          onPress={() => router.push('/join')}
        >
          <Text style={styles.secondaryText}>Tengo un código de invitación</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.ghostText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
      gap: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    actions: {
      gap: spacing.md,
    },
    primary: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryText: {
      color: colors.surface,
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.medium,
    },
    secondary: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    secondaryText: {
      color: colors.text,
      fontSize: typography.fontSizes.subtitle,
    },
    ghost: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    ghostText: {
      color: colors.primary,
      fontSize: typography.fontSizes.subtitle,
    },
    pressed: {
      opacity: 0.9,
    },
  });
