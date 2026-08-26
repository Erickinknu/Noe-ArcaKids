import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const MOCK_SOCIAL = [
  { name: 'TikTok', icon: 'music-note' as const, color: '#000000', time: '45 min hoy', posts: 12, messages: 3 },
  { name: 'Instagram', icon: 'camera-alt' as const, color: '#E1306C', time: '30 min hoy', posts: 8, messages: 5 },
  { name: 'YouTube', icon: 'play-circle' as const, color: '#FF0000', time: '1h 15min hoy', posts: 0, messages: 0 },
  { name: 'Snapchat', icon: 'photo-camera' as const, color: '#FFFC00', time: '15 min hoy', posts: 4, messages: 2 },
  { name: 'Discord', icon: 'headset-mic' as const, color: '#5865F2', time: '20 min hoy', posts: 0, messages: 15 },
  { name: 'Facebook', icon: 'thumb-up' as const, color: '#1877F2', time: '10 min hoy', posts: 3, messages: 1 },
];

export default function SocialScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Redes sociales</Text>
      </Pressable>
      <Text style={styles.description}>Uso de redes sociales de tu hijo hoy.</Text>

      {MOCK_SOCIAL.map((app) => (
        <Card key={app.name} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: app.color + '18' }]}>
              <MaterialIcons name={app.icon} size={22} color={app.color} />
            </View>
            <View style={styles.info}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.time}>{app.time}</Text>
            </View>
            <View style={styles.stats}>
              {app.posts > 0 && (
                <View style={styles.statBadge}>
                  <Text style={styles.statText}>{app.posts} posts</Text>
                </View>
              )}
              {app.messages > 0 && (
                <View style={[styles.statBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.statText, { color: colors.primary }]}>{app.messages} msgs</Text>
                </View>
              )}
            </View>
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
  card: { padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  appName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  time: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: spacing.xs },
  statBadge: { backgroundColor: colors.surfaceHover, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  statText: { fontSize: 10, fontWeight: typography.fontWeights.medium, color: colors.textMuted },
});
