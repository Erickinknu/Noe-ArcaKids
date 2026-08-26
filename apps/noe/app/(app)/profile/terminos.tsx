import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function TerminosScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/profile')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Términos de uso</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>1. Aceptación de los términos</Text>
      <Text style={styles.body}>
        Al usar NOE, aceptas estos términos de uso. Si no estás de acuerdo, no uses
        la app.
      </Text>

      <Text style={styles.sectionTitle}>2. Uso del servicio</Text>
      <Text style={styles.body}>
        NOE está diseñada para que los padres/tutores puedan gestionar el uso digital
        de sus hijos menores de edad. El servicio debe usarse de manera responsable y
        legítima.
      </Text>

      <Text style={styles.sectionTitle}>3. Responsabilidades</Text>
      <Text style={styles.body}>
        Los padres/tutores son responsables del uso que le den a la app y de la
        configuración de los controles parentales.
      </Text>

      <Text style={styles.sectionTitle}>4. Limitación de responsabilidad</Text>
      <Text style={styles.body}>
        NOE se proporciona "tal cual" sin garantías. No nos hacemos responsables por
        daños derivados del uso de la app.
      </Text>

      <Text style={styles.footer}>Última actualización: Enero 2026</Text>
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
  sectionTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  body: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  footer: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
