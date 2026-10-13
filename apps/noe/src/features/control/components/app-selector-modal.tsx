import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import {
  appCategoryService,
  type AppCategory,
} from '@/features/app-categories/services/app-category-service';
import { errorMessage, radius, spacing, typography, useTheme, type ThemeColors } from '@noe-arcakids/shared';

import type { ControlApp, ControlCategory } from './control-types';

interface AppSelectorModalProps {
  visible: boolean;
  title: string;
  childId: string;
  category: ControlCategory;
  candidates: ControlApp[];
  initialSelected: string[];
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Selector reutilizable de apps: buscador + lista de candidatas con toggle.
 * Al guardar persiste las seleccionadas con el setCategory existente.
 * Nota: quitar una app ya clasificada no se persiste porque
 * app-category-service no expone borrado ni categoría neutra (solo upsert).
 */
export function AppSelectorModal({
  visible,
  title,
  childId,
  category,
  candidates,
  initialSelected,
  onClose,
  onSaved,
}: AppSelectorModalProps) {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [saving, setSaving] = useState(false);

  // El padre monta el modal con key por hijo+categoría, así cada apertura
  // parte del estado inicial (initialSelected/query limpios) sin efectos.

  const filtered = candidates.filter((app) => {
    if (query === '') return true;
    const q = query.toLowerCase();
    return app.appLabel.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q);
  });

  function toggle(packageName: string) {
    setSelected((prev) =>
      prev.includes(packageName) ? prev.filter((p) => p !== packageName) : [...prev, packageName]
    );
  }

  async function handleSave() {
    const labelByPkg = new Map(candidates.map((a) => [a.packageName, a.appLabel]));
    const initial = new Set(initialSelected);
    const added = selected.filter((p) => !initial.has(p));
    setSaving(true);
    try {
      for (const pkg of added) {
        await appCategoryService.setCategory(childId, pkg, labelByPkg.get(pkg) ?? pkg, category as AppCategory);
      }
      onSaved();
      onClose();
    } catch (cause) {
      Alert.alert(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.searchRow}>
            <MaterialIcons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={tr('noe.control.searchApps')}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.packageName}
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => {
              const active = selected.includes(item.packageName);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => toggle(item.packageName)}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowLabel} numberOfLines={1}>
                      {item.appLabel}
                    </Text>
                    <Text style={styles.rowPkg} numberOfLines={1}>
                      {item.packageName}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={active ? 'check-circle' : 'radio-button-unchecked'}
                    size={22}
                    color={active ? colors.primary : colors.textMuted}
                  />
                </Pressable>
              );
            }}
          />
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.btnPressed]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelText}>{tr('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>{tr('noe.control.done')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    content: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '75%',
      gap: spacing.md,
    },
    title: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
    },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surface,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.xs,
      fontSize: typography.fontSizes.body,
      color: colors.text,
    },
    list: { flexGrow: 0 },
    separator: { height: 1, backgroundColor: colors.border },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
    rowPressed: { opacity: 0.6 },
    rowInfo: { flex: 1 },
    rowLabel: { fontSize: typography.fontSizes.body, color: colors.text },
    rowPkg: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
    actions: { flexDirection: 'row', gap: spacing.sm },
    btnPressed: { opacity: 0.85 },
    cancelBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cancelText: { color: colors.text, fontWeight: typography.fontWeights.semibold },
    saveBtn: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
    },
    saveText: { color: colors.onPrimary, fontWeight: typography.fontWeights.semibold },
  });
