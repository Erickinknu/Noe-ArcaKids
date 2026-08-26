import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const CATEGORIES = [
  { key: 'adult', label: 'Contenido adulto', icon: 'block' as const, enabled: true },
  { key: 'violence', label: 'Violencia', icon: 'block' as const, enabled: true },
  { key: 'gambling', label: 'Juegos de azar', icon: 'block' as const, enabled: true },
  { key: 'drugs', label: 'Drogas y sustancias', icon: 'block' as const, enabled: true },
  { key: 'chat', label: 'Chats anónimos', icon: 'block' as const, enabled: false },
];

const INITIAL_BLOCKED = ['tiktok.com', 'omegle.com'];

export default function FiltradoWebScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [categories, setCategories] = useState(CATEGORIES);
  const [blockedSites, setBlockedSites] = useState(INITIAL_BLOCKED);
  const [newSite, setNewSite] = useState('');

  const toggleCategory = (key: string) => {
    setCategories((prev) => prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled } : c)));
  };

  const addSite = () => {
    const site = newSite.trim().toLowerCase();
    if (!site) return;
    if (blockedSites.includes(site)) return;
    setBlockedSites((prev) => [...prev, site]);
    setNewSite('');
  };

  const removeSite = (site: string) => {
    setBlockedSites((prev) => prev.filter((s) => s !== site));
  };

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Filtrado web</Text>
      </Pressable>
      <Text style={styles.description}>
        Bloquea sitios web inapropiados en el navegador del niño. Las categorías principales se filtran automáticamente.
      </Text>

      <Text style={styles.sectionLabel}>Categorías bloqueadas</Text>
      <Card>
        {categories.map((cat, i) => (
          <View key={cat.key} style={[styles.catRow, i < categories.length - 1 && styles.catBorder]}>
            <MaterialIcons name={cat.icon} size={20} color={cat.enabled ? colors.danger : colors.textMuted} />
            <Text style={[styles.catLabel, !cat.enabled && styles.catDisabled]}>{cat.label}</Text>
            <Pressable onPress={() => toggleCategory(cat.key)}>
              <MaterialIcons
                name={cat.enabled ? 'toggle-on' : 'toggle-off'}
                size={32}
                color={cat.enabled ? colors.primary : colors.textMuted}
              />
            </Pressable>
          </View>
        ))}
      </Card>

      <Text style={styles.sectionLabel}>Sitios bloqueados manualmente</Text>
      <Card>
        {blockedSites.map((site, i) => (
          <View key={site} style={[styles.siteRow, i < blockedSites.length - 1 && styles.siteBorder]}>
            <MaterialIcons name="public-off" size={18} color={colors.danger} />
            <Text style={styles.siteName}>{site}</Text>
            <Pressable onPress={() => removeSite(site)}>
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        ))}
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="ejemplo.com"
            placeholderTextColor={colors.textMuted}
            value={newSite}
            onChangeText={setNewSite}
            onSubmitEditing={addSite}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]} onPress={addSite}>
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </Card>

      <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}>
        <Text style={styles.saveBtnText}>Guardar filtrado</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  catBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  catLabel: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
  catDisabled: { color: colors.textMuted },
  siteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.sm },
  siteBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  siteName: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.fontSizes.body, color: colors.text, backgroundColor: colors.background },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnPressed: { opacity: 0.85 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
});
