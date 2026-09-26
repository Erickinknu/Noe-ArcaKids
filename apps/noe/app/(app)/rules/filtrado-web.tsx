import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { webFilterService, CATEGORIES, WebFilter } from '@/features/web-filter/services/web-filter-service';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { Card, errorMessage, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';
import type { ChildProfile } from '@noe-arcakids/types';

export default function FiltradoWebScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, error: childrenError, loading: childrenLoading } = useAsyncData<ChildProfile[]>(fetchChildren);

  const fetchFilters = useCallback(async () => {
    if (!selectedChildId) return [];
    return webFilterService.getFilters(selectedChildId);
  }, [selectedChildId]);
  const { data: filters, error: filtersError, loading: filtersLoading, reload: reloadFilters } = useAsyncData<WebFilter[]>(fetchFilters);

  // Build category state from DB filters
  const categories = CATEGORIES.map((cat) => {
    const filter = filters?.find((f) => f.category === cat.id);
    return {
      ...cat,
      enabled: filter?.enabled ?? false,
    };
  });

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

  // ── Child selector ──
  if (!selectedChildId) {
    return (
      <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
        <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.headerTitle}>Filtrado web</Text>
        </Pressable>

        {childrenLoading && <LoadingState text="Cargando hijos..." />}
        {childrenError && <EmptyState icon={<MaterialIcons name="warning" size={48} color={colors.danger} />} title="Error" description={childrenError} />}
        {!childrenLoading && !childrenError && children && children.length === 0 && (
          <EmptyState icon={<MaterialIcons name="child-care" size={48} color={colors.textMuted} />} title="Agrega un hijo primero" description="Ve a la pestaña Hijos para agregar un perfil" />
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
  if (filtersError) return <EmptyState icon={<MaterialIcons name="warning" size={48} color={colors.danger} />} title="Error" description={filtersError} />;

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => setSelectedChildId(null)}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Filtrado web</Text>
      </Pressable>
      <Text style={styles.description}>
        Al activar una categoría, se bloquean las apps de navegación (Chrome, Firefox, etc.)
        en el dispositivo del niño. El filtrado no inspecciona sitios ni contenido por URL.
      </Text>
      <Text style={styles.description}>
        Con al menos una categoría activada los navegadores quedan bloqueados; al desactivar
        todas las categorías, se vuelven a desbloquear.
      </Text>

      <Text style={styles.sectionLabel}>Categorías bloqueadas</Text>
      <Card style={styles.card}>
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

      <Pressable style={({ pressed }) => [styles.backToListBtn, pressed && styles.backToListBtnPressed]}
        onPress={() => setSelectedChildId(null)}>
        <Text style={styles.backToListText}>Cambiar hijo</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  card: { ...shadows.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.md },
  catBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  catLabel: { flex: 1, fontSize: typography.fontSizes.body, color: colors.text },
  catDisabled: { color: colors.textMuted },
  backToListBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  backToListBtnPressed: { backgroundColor: colors.primaryLight },
  backToListText: { color: colors.primary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
  childList: { gap: spacing.sm },
  childCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.md, gap: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.sm },
  childCardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  childCardInfo: { flex: 1 },
  childCardName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childCardMeta: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
});
