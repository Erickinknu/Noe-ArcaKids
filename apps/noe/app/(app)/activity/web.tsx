import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const MOCK_WEB = [
  { site: 'google.com', visits: 45, lastVisit: 'Hace 2 min' },
  { site: 'wikipedia.org', visits: 12, lastVisit: 'Hace 15 min' },
  { site: 'roblox.com', visits: 8, lastVisit: 'Hace 1 hora' },
  { site: 'tiktok.com', visits: 23, lastVisit: 'Hace 30 min' },
  { site: 'youtube.com', visits: 34, lastVisit: 'Hace 5 min' },
  { site: 'instagram.com', visits: 18, lastVisit: 'Hace 20 min' },
];

export default function WebActivityScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Páginas web visitadas</Text>
      </Pressable>
      <Text style={styles.description}>Sitios web que ha visitado tu hijo recientemente.</Text>

      {MOCK_WEB.map((item, i) => (
        <Card key={item.site} style={styles.card}>
          <View style={styles.row}>
            <MaterialIcons name="language" size={20} color={colors.primary} />
            <View style={styles.info}>
              <Text style={styles.siteName}>{item.site}</Text>
              <Text style={styles.meta}>{item.visits} visitas · {item.lastVisit}</Text>
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
  card: { ...spacing.sm as any },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1 },
  siteName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  meta: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
});
