import { ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function PrivacidadScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Política de privacidad</Text>
      </Pressable>

      <Text style={styles.body}>
        En NOE valoramos tu privacidad y la de tus hijos. Esta política describe cómo
        recopilamos, usamos y protegemos tu información.
      </Text>

      <Text style={styles.sectionTitle}>Información que recopilamos</Text>
      <Text style={styles.body}>
        • Nombre y correo electrónico del padre/tutor{'\n'}
        • Nombre y perfil del niño{'\n'}
        • Datos de uso del dispositivo del niño (apps, tiempo de uso, ubicación){'\n'}
        • Configuración de parental controls
      </Text>

      <Text style={styles.sectionTitle}>Cómo usamos tu información</Text>
      <Text style={styles.body}>
        • Para proporcionar los servicios de control parental{'\n'}
        • Para enviar notificaciones y reportes a los padres{'\n'}
        • Para mejorar la experiencia de la app
      </Text>

      <Text style={styles.sectionTitle}>Protección de datos</Text>
      <Text style={styles.body}>
        Todos los datos se transmiten y almacenan de forma encriptada. No vendemos ni
        compartimos información personal con terceros.
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
