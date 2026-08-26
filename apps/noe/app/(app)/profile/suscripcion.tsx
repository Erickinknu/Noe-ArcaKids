import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const PLANS = [
  {
    name: 'Gratuito',
    price: '$0',
    period: 'para siempre',
    features: ['1 hijo', 'Control básico de tiempo', '5 apps bloqueadas', 'Reportes semanales'],
    current: true,
  },
  {
    name: 'Familia',
    price: '$4.99',
    period: '/mes',
    features: ['Hijos ilimitados', 'Control avanzado', 'Apps ilimitadas', 'Reportes diarios', 'Zonas seguras', 'Modo estudio'],
    current: false,
  },
  {
    name: 'Familia Anual',
    price: '$39.99',
    period: '/año',
    features: ['Todo de Familia', 'Ahorra 33%', 'Soporte prioritario', 'Nuevas funciones primero'],
    current: false,
  },
];

export default function SuscripcionScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Suscripción</Text>
      </Pressable>

      <Text style={styles.subtitle}>
        Elige el plan que mejor se adapte a tu familia.
      </Text>

      {PLANS.map((plan) => (
        <Card
          key={plan.name}
          style={[styles.planCard, plan.current && styles.planCurrent]}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.planPrice}>{plan.price}</Text>
              <Text style={styles.planPeriod}>{plan.period}</Text>
            </View>
          </View>
          {plan.features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <MaterialIcons name="check" size={18} color={colors.success} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
          {plan.current ? (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Plan actual</Text>
            </View>
          ) : (
            <Button variant="primary" size="sm" style={{ marginTop: spacing.sm }}>
              Elegir plan
            </Button>
          )}
        </Card>
      ))}
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
  subtitle: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  planCard: {
    gap: spacing.sm,
  },
  planCurrent: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  planPrice: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  planPeriod: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  currentBadgeText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.primary,
  },
});
