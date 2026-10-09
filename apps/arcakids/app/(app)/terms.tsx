import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { Card, spacing, typography, useTheme, type ThemeColors } from '@noe-arcakids/shared';

export default function TermsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <ScreenHeader title="Reglas de ARCA KIDS" />

        <Card>
          <Text style={styles.emoji}>🛡️</Text>
          <Text style={styles.cardTitle}>¿Qué es ARCA KIDS?</Text>
          <Text style={styles.body}>
            ARCA KIDS es una app que te ayuda a usar tu tablet o celular de forma segura y
            divertida. Tus papás o tu tutor eligen contigo las reglas: cuánto tiempo jugar,
            qué apps puedes usar y a qué hora descansar.
          </Text>
        </Card>

        <Card>
          <Text style={styles.emoji}>👀</Text>
          <Text style={styles.cardTitle}>¿Qué pueden ver mamá o papá?</Text>
          <Text style={styles.body}>
            • Cuánto tiempo usas cada app.{'\n'}
            • Si entras o sales de los lugares seguros que marcaron (como casa o escuela).{'\n'}
            • Si una página fue bloqueada para cuidarte.{'\n'}
            No leen tus conversaciones ni tus mensajes privados.
          </Text>
        </Card>

        <Card>
          <Text style={styles.emoji}>📏</Text>
          <Text style={styles.cardTitle}>Tus reglas</Text>
          <Text style={styles.body}>
            1. Usa tu tiempo de pantalla con alegría y respeta los horarios de estudio y
            descanso.{'\n'}
            2. Si necesitas más tiempo o una app bloqueada, pide permiso con el botón de
            solicitar.{'\n'}
            3. No intentes borrar la app ni quitar sus permisos: es tu escudo de
            protección.{'\n'}
            4. Si algo te molesta o te preocupa en internet, cuéntale a mamá, papá o tu
            tutor.
          </Text>
        </Card>

        <Card>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.cardTitle}>Tu privacidad</Text>
          <Text style={styles.body}>
            Tus datos solo los usa tu familia para cuidarte. Nada se vende ni se comparte con
            extraños. Si tienes preguntas, pide a mamá o papá que escriban al equipo de
            ayuda. ¡Tú también tienes derechos y tu opinión importa!
          </Text>
        </Card>

        <Text style={styles.footer}>Última actualización: octubre de 2026</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    emoji: {
      fontSize: 32,
      marginBottom: spacing.xs,
    },
    cardTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      marginBottom: spacing.sm,
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
      marginTop: spacing.md,
    },
  });
