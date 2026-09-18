import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface PlanOption {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
}

const PLANS: PlanOption[] = [
  {
    id: 'family',
    icon: 'family-restroom',
    title: 'Crear mi familia',
    subtitle: 'Configura el perfil, vincula los dispositivos de tus hijos y aplica las reglas.',
    color: '#6366F1',
  },
  {
    id: 'demo',
    icon: 'travel-explore',
    title: 'Explorar (demo)',
    subtitle: 'Crea una cuenta gratuita para ver cómo funciona NOE antes de configurar todo.',
    color: '#059669',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <MaterialIcons name="shield-moon" size={56} color={colors.primary} />
        <Text style={styles.title}>Bienvenido a NOE</Text>
        <Text style={styles.subtitle}>Elige cómo quieres empezar</Text>
      </View>

      <View style={styles.plans}>
        {PLANS.map((plan) => (
          <Pressable
            key={plan.id}
            style={({ pressed }) => [styles.planCard, pressed && styles.planCardPressed]}
            onPress={() => router.push(`/(auth)/register?plan=${plan.id}`)}
          >
            <View style={[styles.planIcon, { backgroundColor: plan.color + '18' }]}>
              <MaterialIcons name={plan.icon} size={28} color={plan.color} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>{plan.title}</Text>
              <Text style={styles.planSubtitle}>{plan.subtitle}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.loginLink, pressed && styles.loginLinkPressed]}
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={styles.loginText}>Ya tengo una cuenta — Iniciar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: colors.background,
      gap: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.lg,
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
    },
    plans: {
      gap: spacing.md,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    planCardPressed: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    planIcon: {
      width: 52,
      height: 52,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    planInfo: {
      flex: 1,
      gap: 2,
    },
    planTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    planSubtitle: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    loginLink: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
    },
    loginLinkPressed: {
      opacity: 0.7,
    },
    loginText: {
      fontSize: typography.fontSizes.body,
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
      textAlign: 'center',
    },
  });