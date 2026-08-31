import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, colors, radius, spacing, typography } from '@noe-arcakids/shared';

const MOCK_APPS = [
  { name: 'TikTok', package: 'com.zhiliaoapp.musically', installed: 'Hace 3 días', trusted: false },
  { name: 'Snapchat', package: 'com.snapchat.android', installed: 'Hace 1 semana', trusted: false },
  { name: 'Discord', package: 'com.discord', installed: 'Hace 2 semanas', trusted: true },
  { name: 'Roblox', package: 'com.roblox.client', installed: 'Hace 1 mes', trusted: true },
  { name: 'VPN Free', package: 'com.vpn.free.unlimited', installed: 'Ayer', trusted: false },
  { name: 'Calculator+', package: 'com.calculator.vault', installed: 'Hoy', trusted: false },
];

export default function AppsScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();

  const unauthorized = MOCK_APPS.filter((a) => !a.trusted);

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/activity')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Apps instaladas</Text>
      </Pressable>

      {unauthorized.length > 0 && (
        <>
          <View style={styles.alertBanner}>
            <MaterialIcons name="warning" size={20} color={colors.warning} />
            <Text style={styles.alertText}>{unauthorized.length} apps detectadas sin permiso</Text>
          </View>

          <Text style={styles.sectionLabel}>Apps no autorizadas</Text>
          {unauthorized.map((app) => (
            <Card key={app.package} style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
                  <MaterialIcons name="warning" size={20} color={colors.warning} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={styles.meta}>{app.installed}</Text>
                </View>
                <Pressable style={styles.blockBtn}>
                  <Text style={styles.blockBtnText}>Bloquear</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>Todas las apps</Text>
      {MOCK_APPS.map((app) => (
        <Card key={app.package} style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: app.trusted ? colors.successLight : colors.warningLight }]}>
              <MaterialIcons name={app.trusted ? 'check-circle' : 'help-outline'} size={20} color={app.trusted ? colors.success : colors.warning} />
            </View>
            <View style={styles.info}>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.meta}>Instalada: {app.installed}</Text>
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
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warningLight, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.warning },
  alertText: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.warning },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  card: { padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  appName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.medium, color: colors.text },
  meta: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  blockBtn: { backgroundColor: colors.dangerLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  blockBtnText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.semibold, color: colors.danger },
});
