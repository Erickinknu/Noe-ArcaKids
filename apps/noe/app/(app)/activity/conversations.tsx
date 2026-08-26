import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const MOCK_CONVERSATIONS = [
  {
    app: 'WhatsApp',
    color: '#25D366',
    icon: 'chat' as const,
    contacts: [
      { name: 'María (amiga)', messages: 23, lastMessage: '¿Vienes al parque hoy?', time: 'Hace 5 min', flagged: false },
      { name: 'Grupo "Los Locos"', messages: 45, lastMessage: 'jajaja no manches', time: 'Hace 15 min', flagged: false },
      { name: 'Número desconocido', messages: 3, lastMessage: 'Hola, ¿quién eres?', time: 'Hace 1 hora', flagged: true },
    ],
  },
  {
    app: 'Instagram',
    color: '#E1306C',
    icon: 'camera-alt' as const,
    contacts: [
      { name: '@amigos_del_cole', messages: 12, lastMessage: 'DM: mira este meme', time: 'Hace 20 min', flagged: false },
      { name: '@desconocido_123', messages: 1, lastMessage: 'Hola, te sigo', time: 'Hace 3 horas', flagged: true },
    ],
  },
  {
    app: 'TikTok',
    color: '#000000',
    icon: 'music-note' as const,
    contacts: [
      { name: '@creator_fan', messages: 5, lastMessage: 'Comentario: increíble video', time: 'Hace 30 min', flagged: false },
    ],
  },
  {
    app: 'Telegram',
    color: '#0088CC',
    icon: 'send' as const,
    contacts: [
      { name: 'Canal "Noticias"', messages: 8, lastMessage: 'Última hora: ...', time: 'Hace 45 min', flagged: false },
    ],
  },
];

export default function ConversationsScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Conversaciones</Text>
      </Pressable>
      <Text style={styles.description}>Mensajes y conversaciones en apps de mensajería.</Text>

      {MOCK_CONVERSATIONS.map((app) => (
        <View key={app.app}>
          <View style={styles.appHeader}>
            <View style={[styles.appIcon, { backgroundColor: app.color + '18' }]}>
              <MaterialIcons name={app.icon} size={20} color={app.color} />
            </View>
            <Text style={styles.appName}>{app.app}</Text>
            <Text style={styles.appCount}>{app.contacts.length} contactos</Text>
          </View>

          {app.contacts.map((contact, i) => (
            <Card key={i} style={[styles.card, contact.flagged && styles.cardFlagged]}>
              <View style={styles.row}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>{contact.name[0]}</Text>
                </View>
                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.contactName, contact.flagged && { color: colors.danger }]}>
                      {contact.name}
                    </Text>
                    {contact.flagged && <MaterialIcons name="warning" size={14} color={colors.danger} />}
                  </View>
                  <Text style={styles.lastMessage} numberOfLines={1}>{contact.lastMessage}</Text>
                </View>
                <View style={styles.rightCol}>
                  <Text style={styles.time}>{contact.time}</Text>
                  <Text style={styles.msgCount}>{contact.messages} msgs</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  appIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  appCount: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginLeft: 'auto' },
  card: { padding: spacing.sm },
  cardFlagged: { borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.dangerLight },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceHover, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.bold, color: colors.textMuted },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  contactName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  lastMessage: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  rightCol: { alignItems: 'flex-end' },
  time: { fontSize: 10, color: colors.textMuted },
  msgCount: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
});
