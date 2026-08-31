import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { webFilterService, CATEGORIES, WebFilter } from '@/features/web-filter/services/web-filter-service';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';
import type { ChildProfile } from '@noe-arcakids/types';

export default function FiltradoWebScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [newSite, setNewSite] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, error: childrenError, loading: childrenLoading, reload: reloadChildren } = useAsyncData<ChildProfile[]>(fetchChildren);

  const fetchFilters = useCallback(async () => {
    if (!selectedChildId) return [];
    return webFilterService.getFilters(selectedChildId);
  }, [selectedChildId]);
  const { data: filters, error: filtersError, loading: filtersLoading, reload: reloadFilters } = useAsyncData<WebFilter[]>(fetchFilters);

  const loading = childrenLoading || (selectedChildId && filtersLoading);
  const error = childrenError || filtersError;

  // Build category state from DB filters
  const categories = CATEGORIES.map((cat) => {
    const filter = filters?.find((f) => f.category === cat.id);
    return {
      ...cat,
      enabled: filter?.enabled ?? false,
      blockedSites: filter?.blockedSites ?? [],
    };
  });

  const allBlockedSites = categories.flatMap((c) => c.blockedSites);

  const handleToggle = async (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat || !selectedChildId) return;
    try {
      await webFilterService.toggleCategory(selectedChildId, categoryId, !cat.enabled);
      reloadFilters();
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    }
  };

  const handleAddSite = async () => {
    const site = newSite.trim().toLowerCase();
    if (!site || !selectedChildId) return;
    if (allBlockedSites.includes(site)) return;

    // Add to the first enabled category, or 'adult' as default
    const target = categories.find((c) => c.enabled) ?? categories.find((c) => c.id === 'adult');
    if (!target) return;

    setSaving(true);
    try {
      await webFilterService.addBlockedSite(selectedChildId, target.id, site);
      setNewSite('');
      reloadFilters();
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSite = async (site: string) => {
    if (!selectedChildId) return;
    const cat = categories.find((c) => c.blockedSites.includes(site));
    if (!cat) return;
    try {
      await webFilterService.removeBlockedSite(selectedChildId, cat.id, site);
      reloadFilters();
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    }
  };

  // ── Child selector ──
  if (!selectedChildId) {
    return (
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
        <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>Filtrado web</Text>
        </Pressable>

        {childrenLoading && <LoadingState text="Cargando hijos..." />}
        {childrenError && <EmptyState icon="⚠️" title="Error" description={childrenError} />}
        {!childrenLoading && !childrenError && children && children.length === 0 && (
          <EmptyState icon="👶" title="Agrega un hijo primero" description="Ve a la pestaña Hijos para agregar un perfil" />
        )}
        {children && children.length > 0 && (
          <>
            <Text style={styles.description}>Selecciona un hijo para configurar su filtrado web</Text>
            <View style={styles.childList}>
              {children.map((child) => (
                <Pressable
                  key={child.id}
                  style={({ pressed }) => [styles.childCard, pressed && styles.childCardPressed]}
                  onPress={() => setSelectedChildId(child.id)}
                >
                  <MaterialIcons name="person" size={24} color={colors.primary} />
                  <View style={styles.childCardInfo}>
                    <Text style={styles.childCardName}>{child.displayName}</Text>
                    <Text style={styles.childCardMeta}>Toca para configurar</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  if (filtersLoading) return <LoadingState text="Cargando filtros..." />;
  if (filtersError) return <EmptyState icon="⚠️" title="Error" description={filtersError} />;

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => setSelectedChildId(null)}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Filtrado web</Text>
      </Pressable>
      <Text style={styles.description}>
        Bloquea sitios web inapropiados en el navegador del niño. Las categorías principales se filtran automáticamente.
      </Text>

      <Text style={styles.sectionLabel}>Categorías bloqueadas</Text>
      <Card>
        {categories.map((cat, i) => (
          <View key={cat.id} style={[styles.catRow, i < categories.length - 1 && styles.catBorder]}>
            <MaterialIcons name={cat.icon} size={20} color={cat.enabled ? colors.danger : colors.textMuted} />
            <Text style={[styles.catLabel, !cat.enabled && styles.catDisabled]}>{cat.label}</Text>
            <Pressable onPress={() => handleToggle(cat.id)}>
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
        {allBlockedSites.length === 0 && (
          <Text style={styles.emptyText}>No hay sitios bloqueados aún</Text>
        )}
        {allBlockedSites.map((site, i) => (
          <View key={site} style={[styles.siteRow, i < allBlockedSites.length - 1 && styles.siteBorder]}>
            <MaterialIcons name="public-off" size={18} color={colors.danger} />
            <Text style={styles.siteName}>{site}</Text>
            <Pressable onPress={() => handleRemoveSite(site)}>
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
            onSubmitEditing={handleAddSite}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
            onPress={handleAddSite}
            disabled={saving}
          >
            <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          </Pressable>
        </View>
      </Card>

      <Pressable style={({ pressed }) => [styles.backToListBtn, pressed && styles.backToListBtnPressed]}
        onPress={() => setSelectedChildId(null)}>
        <Text style={styles.backToListText}>Cambiar hijo</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
  emptyText: { fontSize: typography.fontSizes.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  addInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: typography.fontSizes.body, color: colors.text, backgroundColor: colors.background },
  addBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  addBtnPressed: { opacity: 0.85 },
  backToListBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  backToListBtnPressed: { backgroundColor: colors.primaryLight },
  backToListText: { color: colors.primary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
  childList: { gap: spacing.sm },
  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  childCardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  childCardInfo: { flex: 1 },
  childCardName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childCardMeta: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
});
