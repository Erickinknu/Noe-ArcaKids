import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { geofencingService, type Geofence } from '@/features/geofencing/services/geofencing-service';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

type ChildOption = { id: string; displayName: string };

export default function GeofencingScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [zones, setZones] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildOption[]>([]);

  // Add form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');
  const [formRadius, setFormRadius] = useState('100');
  const [formChildId, setFormChildId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [zonesData, family] = await Promise.all([
        geofencingService.listGeofences(),
        familyService.getMyFamily(),
      ]);
      setZones(zonesData);

      const kids = await childService.listChildren(family.family.id);
      setChildren(kids.map((c) => ({ id: c.id, displayName: c.displayName })));
      if (kids.length > 0 && !formChildId) {
        setFormChildId(kids[0].id);
      }
    } catch (cause: any) {
      setError(cause?.message ?? 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleZone = async (id: string, currentEnabled: boolean) => {
    try {
      setZones((prev) => prev.map((z) => (z.id === id ? { ...z, enabled: !currentEnabled } : z)));
      await geofencingService.toggleGeofence(id, !currentEnabled);
    } catch {
      setZones((prev) => prev.map((z) => (z.id === id ? { ...z, enabled: currentEnabled } : z)));
      Alert.alert('Error', 'No se pudo actualizar la zona');
    }
  };

  const removeZone = (id: string) => {
    Alert.alert('Eliminar zona', '¿Estás seguro de que deseas eliminar esta zona segura?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setZones((prev) => prev.filter((z) => z.id !== id));
            await geofencingService.removeGeofence(id);
          } catch {
            fetchData();
            Alert.alert('Error', 'No se pudo eliminar la zona');
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la zona');
      return;
    }
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    const radius = parseInt(formRadius, 10);

    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Ingresa coordenadas válidas');
      return;
    }
    if (isNaN(radius) || radius < 10 || radius > 5000) {
      Alert.alert('Error', 'El radio debe ser entre 10 y 5000 metros');
      return;
    }
    if (!formChildId) {
      Alert.alert('Error', 'Selecciona un hijo');
      return;
    }

    setSaving(true);
    try {
      const newZone = await geofencingService.addGeofence(
        formChildId,
        formName.trim(),
        lat,
        lng,
        radius
      );
      setZones((prev) => [newZone, ...prev]);
      setShowForm(false);
      setFormName('');
      setFormLat('');
      setFormLng('');
      setFormRadius('100');
    } catch (cause: any) {
      Alert.alert('Error', cause?.message ?? 'No se pudo crear la zona');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Cargando zonas seguras..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}>
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/rules')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Zonas seguras</Text>
      </Pressable>
      <Text style={styles.description}>
        Define zonas seguras (casa, escuela, etc.). Recibirás una alerta cuando tu hijo salga de una zona.
      </Text>

      {zones.length === 0 && !showForm ? (
        <EmptyState icon="📍" title="Sin zonas definidas" description="Agrega una zona segura para comenzar" />
      ) : (
        zones.map((zone) => (
          <Card key={zone.id}>
            <View style={styles.zoneHeader}>
              <View style={styles.zoneIcon}>
                <MaterialIcons name="location-on" size={20} color={zone.enabled ? colors.primary : colors.textMuted} />
              </View>
              <View style={styles.zoneInfo}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.zoneCoords}>
                  {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                </Text>
              </View>
              <Switch
                value={zone.enabled}
                onValueChange={() => toggleZone(zone.id, zone.enabled)}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
            <View style={styles.zoneFooter}>
              <Text style={styles.zoneRadius}>Radio: {zone.radius}m</Text>
              <Pressable onPress={() => removeZone(zone.id)}>
                <Text style={styles.zoneRemove}>Eliminar</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {showForm ? (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Nueva zona segura</Text>

          <Text style={styles.formLabel}>Nombre</Text>
          <TextInput
            style={styles.formInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="Ej: Casa, Escuela"
            placeholderTextColor={colors.textMuted}
          />

          {children.length > 1 && (
            <>
              <Text style={styles.formLabel}>Hijo</Text>
              <View style={styles.childPicker}>
                {children.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.childOption,
                      formChildId === c.id && styles.childOptionSelected,
                    ]}
                    onPress={() => setFormChildId(c.id)}
                  >
                    <Text
                      style={[
                        styles.childOptionText,
                        formChildId === c.id && styles.childOptionTextSelected,
                      ]}
                    >
                      {c.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={styles.formLabel}>Latitud</Text>
          <TextInput
            style={styles.formInput}
            value={formLat}
            onChangeText={setFormLat}
            placeholder="ej: -34.6037"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.formLabel}>Longitud</Text>
          <TextInput
            style={styles.formInput}
            value={formLng}
            onChangeText={setFormLng}
            placeholder="ej: -58.3816"
            keyboardType="decimal-pad"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.formLabel}>Radio (metros)</Text>
          <TextInput
            style={styles.formInput}
            value={formRadius}
            onChangeText={setFormRadius}
            placeholder="100"
            keyboardType="number-pad"
            placeholderTextColor={colors.textMuted}
          />

          <View style={styles.formActions}>
            <Button variant="outline" onPress={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onPress={handleAdd} loading={saving}>
              Guardar zona
            </Button>
          </View>
        </Card>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => setShowForm(true)}
        >
          <MaterialIcons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.addBtnText}>Agregar zona segura</Text>
        </Pressable>
      )}
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
  zoneCoords: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  zoneFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  zoneRadius: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  zoneRemove: { fontSize: typography.fontSizes.caption, color: colors.danger, fontWeight: typography.fontWeights.medium },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md },
  addBtnPressed: { backgroundColor: colors.primaryLight },
  addBtnText: { fontSize: typography.fontSizes.body, color: colors.primary, fontWeight: typography.fontWeights.medium },
  formCard: { borderColor: colors.primary, borderWidth: 1.5 },
  formTitle: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.bold, color: colors.text, marginBottom: spacing.md },
  formLabel: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.sm },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.fontSizes.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  childPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  childOption: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  childOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  childOptionText: { fontSize: typography.fontSizes.caption, color: colors.text },
  childOptionTextSelected: { color: colors.onPrimary },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
});
