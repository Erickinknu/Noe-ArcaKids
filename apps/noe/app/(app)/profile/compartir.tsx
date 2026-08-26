import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

export default function CompartirScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  async function handleShare() {
    try {
      await Share.share({
        message:
          'Descarga NOE - La app para padres que quieren cuidar a sus hijos en el mundo digital. https://noe-app.com/download',
        title: 'Compartir NOE',
      });
    } catch {}
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
    >
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Compartir app</Text>
      </Pressable>

      <Card style={styles.centerCard}>
        <MaterialIcons name="share" size={48} color={colors.primary} />
        <Text style={styles.title}>Comparte NOE con otros padres</Text>
        <Text style={styles.description}>
          Envía la app a otro padre de la familia o a otras familias para que también
          puedan cuidar a sus hijos en el mundo digital.
        </Text>
        <Pressable style={styles.shareButton} onPress={handleShare}>
          <MaterialIcons name="share" size={20} color="#fff" />
          <Text style={styles.shareButtonText}>Compartir ahora</Text>
        </Pressable>
      </Card>
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
  centerCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shareButtonText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.bold,
    color: '#fff',
  },
});
