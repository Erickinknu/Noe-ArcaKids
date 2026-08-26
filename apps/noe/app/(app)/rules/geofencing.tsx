import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

type SafeZone = {
  id: string;
  name: string;
  address: string;
  radius: number;
  enabled: boolean;
};

const INITIAL_ZONES: SafeZone[] = [
  { id: '1', name: 'Casa', address: 'Av. Principal 123', radius: 200, enabled: true },
  { id: '2', name: 'Escuela', address: 'Calle Educación 456', radius: 300, enabled: true },
];

export default function GeofencingScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [zones, setZones] = useState<SafeZone[]>(INITIAL_ZONES);

  const toggleZone = (id: string) => {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)));
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  };

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.back()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Zonas seguras</Text>
      </Pressable>
      <Text style={styles.description}>
        Define zonas seguras (casa, escuela, etc.). Recibirás una alerta cuando tu hijo salga de una zona.
      </Text>

      {zones.map((zone) => (
        <Card key={zone.id}>
          <View style={styles.zoneHeader}>
            <View style={styles.zoneIcon}>
              <MaterialIcons name="location-on" size={20} color={zone.enabled ? colors.primary : colors.textMuted} />
            </View>
            <View style={styles.zoneInfo}>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.zoneAddress}>{zone.address}</Text>
            </View>
            <Pressable onPress={() => toggleZone(zone.id)}>
              <MaterialIcons
                name={zone.enabled ? 'toggle-on' : 'toggle-off'}
                size={32}
                color={zone.enabled ? colors.primary : colors.textMuted}
              />
            </Pressable>
          </View>
          <View style={styles.zoneFooter}>
            <Text style={styles.zoneRadius}>Radio: {zone.radius}m</Text>
            <Pressable onPress={() => removeZone(zone.id)}>
              <Text style={styles.zoneRemove}>Eliminar</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <Pressable style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}>
        <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
        <Text style={styles.addBtnText}>Agregar zona segura</Text>
      </Pressable>

      <Pressable style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}>
        <Text style={styles.saveBtnText}>Guardar zonas</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  description: { fontSize: typography.fontSizes.body, color: colors.textMuted, lineHeight: 22 },
  zoneHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  zoneIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  zoneInfo: { flex: 1 },
  zoneName: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.text },
  zoneAddress: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  zoneFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  zoneRadius: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  zoneRemove: { fontSize: typography.fontSizes.caption, color: colors.danger, fontWeight: typography.fontWeights.medium },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md },
  addBtnPressed: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: typography.fontSizes.body, color: colors.primary, fontWeight: typography.fontWeights.medium },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  saveBtnPressed: { opacity: 0.85 },
  saveBtnText: { color: colors.onPrimary, fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold },
});
