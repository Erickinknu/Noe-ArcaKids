import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, colors, radius, spacing, typography } from '@noe-arcakids/shared';

const MOCK_MEDIA = [
  { type: 'image', from: 'WhatsApp - Grupo Familia', time: 'Hace 10 min', source: 'Recibido' },
  { type: 'video', from: 'Instagram - @amigos', time: 'Hace 30 min', source: 'Recibido' },
  { type: 'image', from: 'Telegram - Canal Noticias', time: 'Hace 1 hora', source: 'Recibido' },
  { type: 'video', from: 'TikTok - @viral', time: 'Hace 2 horas', source: 'Descargado' },
  { type: 'image', from: 'Snapchat - María', time: 'Ayer', source: 'Recibido' },
];

export default function MediaScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  const images = MOCK_MEDIA.filter((m) => m.type === 'image');
  const videos = MOCK_MEDIA.filter((m) => m.type === 'video');

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Imágenes y videos recibidos</Text>
      </Pressable>
      <Text style={styles.description}>Archivos multimedia recibidos en el dispositivo de tu hijo.</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <MaterialIcons name="image" size={24} color={colors.primary} />
          <Text style={styles.statValue}>{images.length}</Text>
          <Text style={styles.statLabel}>Imágenes</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialIcons name="videocam" size={24} color={colors.danger} />
          <Text style={styles.statValue}>{videos.length}</Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Recientes</Text>
      {MOCK_MEDIA.map((item, i) => (
        <Card key={i} style={styles.card}>
          <View style={styles.row}>
            <MaterialIcons
              name={item.type === 'image' ? 'image' : 'videocam'}
              size={22}
              color={item.type === 'image' ? colors.primary : colors.danger}
            />
            <View style={styles.info}>
              <Text style={styles.source}>{item.from}</Text>
              <Text style={styles.meta}>{item.source} · {item.time}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={18} color={colors.textMuted} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text, marginTop: spacing.xs },
  statLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  card: { padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  source: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  meta: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
});
