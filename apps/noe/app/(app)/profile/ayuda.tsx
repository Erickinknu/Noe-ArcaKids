import { ScrollView, StyleSheet, Text, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const FAQ = [
  {
    q: '¿Cómo vinculo el teléfono de mi hijo?',
    a: 'Ve a Hijos > Vincular dispositivo y sigue las instrucciones en pantalla.',
  },
  {
    q: '¿Cómo cambio el límite de tiempo?',
    a: 'Ve a Control, selecciona a tu hijo y ajusta el límite diario.',
  },
  {
    q: '¿Cómo funciona el modo estudio?',
    a: 'El modo estudio bloquea todas las apps excepto las educativas durante el horario configurado.',
  },
  {
    q: '¿Puedo controlar más de un dispositivo?',
    a: 'Sí, puedes vincular todos los dispositivos de tus hijos desde la sección Hijos.',
  },
];

export default function AyudaScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Conseguir ayuda</Text>
      </Pressable>

      <Card>
        {FAQ.map((item, i) => (
          <Pressable
            key={i}
            style={[styles.faqItem, i < FAQ.length - 1 && styles.faqBorder]}
          >
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </Pressable>
        ))}
      </Card>

      <Pressable
        style={styles.linkRow}
        onPress={() => Linking.openURL('mailto:soporte@noe-app.com')}
      >
        <MaterialIcons name="email" size={20} color={colors.primary} />
        <Text style={styles.linkText}>Contactar soporte</Text>
      </Pressable>
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
  faqItem: {
    paddingVertical: spacing.md,
  },
  faqBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  faqQ: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  faqA: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  linkText: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
});
