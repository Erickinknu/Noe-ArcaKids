import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const MOCK_YT = [
  { title: 'Minecraft: Episodio 1 - ¡Nueva aventura!', channel: 'GamePlay MX', duration: '14:32', time: 'Hace 10 min' },
  { title: 'Cómo dibujar anime paso a paso', channel: 'Arte Fácil', duration: '8:15', time: 'Hace 1 hora' },
  { title: 'Experimentos de ciencia caseros', channel: 'Ciencia Divertida', duration: '12:47', time: 'Hace 2 horas' },
  { title: 'Las mejores canciones infantiles 2026', channel: 'Kids Music', duration: '45:00', time: 'Ayer' },
  { title: 'Tutorial de Roblox Studio', channel: 'Roblox Guru', duration: '22:10', time: 'Ayer' },
];

export default function YoutubeScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>YouTube - Videos vistos</Text>
      </Pressable>
      <Text style={styles.description}>Videos que tu hijo ha visto recientemente en YouTube.</Text>

      {MOCK_YT.map((item, i) => (
        <Card key={i} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.thumb}>
              <MaterialIcons name="play-circle-fill" size={32} color="#FF0000" />
            </View>
            <View style={styles.info}>
              <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.channel}>{item.channel}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.duration}>{item.duration}</Text>
                <Text style={styles.time}>· {item.time}</Text>
              </View>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  card: { padding: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 64, height: 48, borderRadius: radius.md, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  videoTitle: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text, lineHeight: 20 },
  channel: { fontSize: typography.fontSizes.caption, color: colors.primary, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  duration: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  time: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
});