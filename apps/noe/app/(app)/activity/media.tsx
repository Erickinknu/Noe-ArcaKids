import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function MediaScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  useLocalSearchParams<{ childId?: string }>();

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Imágenes y videos recibidos</Text>
      </Pressable>
      <Text style={styles.description}>Archivos multimedia recibidos en el dispositivo de tu hijo.</Text>

      <EmptyState
        icon="🖼️"
        title="Aún no hay datos multimedia"
        description="Las imágenes y videos aparecerán aquí cuando la app del dispositivo de tu hijo reporte esta información."
      />
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
});