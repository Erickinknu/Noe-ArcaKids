import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { useScreenPadding } from '@/hooks/use-screen-padding';
import { deviceControlService, type ChildLocation } from '@/features/device-control/services/device-control-service';
import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const DEFAULT_REGION = {
  latitude: -12.0464,   // Lima, Peru
  longitude: -77.0428,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function LocationScreen() {
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const [locations, setLocations] = useState<ChildLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const fetchLocations = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await deviceControlService.getChildrenLocations();
      setLocations(data);
      if (data.length > 0 && !selectedChild) {
        setSelectedChild(data[0].childId);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  }, [selectedChild]);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(() => fetchLocations(true), 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const selected = locations.find((l) => l.childId === selectedChild);
  const region = selected
    ? {
        latitude: selected.latitude,
        longitude: selected.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: screenPadding.paddingTop }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/(app)/activity')}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Ubicar hijos</Text>
        <Pressable style={styles.refreshBtn} onPress={() => fetchLocations(true)}>
          <MaterialIcons name="refresh" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading && locations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Obteniendo ubicaciones...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchLocations()}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : locations.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="location-off" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No hay ubicaciones disponibles</Text>
          <Text style={styles.emptyHint}>Los dispositivos hijos deben tener GPS activo</Text>
        </View>
      ) : (
        <>
          {/* Map */}
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            showsUserLocation={false}
            showsMyLocationButton={false}
          >
            {locations.map((loc) => (
              <Marker
                key={loc.childId}
                coordinate={{
                  latitude: loc.latitude,
                  longitude: loc.longitude,
                }}
                title={loc.displayName}
                description={
                  loc.isOnline
                    ? 'En línea'
                    : `Última ubicación: ${loc.locationUpdatedAt ? new Date(loc.locationUpdatedAt).toLocaleTimeString() : 'Desconocido'}`
                }
                pinColor={loc.isOnline ? colors.success : colors.textMuted}
              />
            ))}
          </MapView>

          {/* Child selector chips */}
          <View style={styles.chipBar}>
            {locations.map((loc) => (
              <Pressable
                key={loc.childId}
                style={[
                  styles.childChip,
                  selectedChild === loc.childId && styles.childChipActive,
                ]}
                onPress={() => setSelectedChild(loc.childId)}
              >
                <View style={[styles.statusDot, { backgroundColor: loc.isOnline ? colors.success : colors.textMuted }]} />
                <Text
                  style={[
                    styles.childChipText,
                    selectedChild === loc.childId && styles.childChipTextActive,
                  ]}
                >
                  {loc.displayName}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Selected child info card */}
          {selected && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={20} color={colors.primary} />
                <Text style={styles.infoName}>{selected.displayName}</Text>
                <View style={[styles.onlineBadge, { backgroundColor: selected.isOnline ? colors.successLight : colors.surface }]}>
                  <Text style={[styles.onlineText, { color: selected.isOnline ? colors.success : colors.textMuted }]}>
                    {selected.isOnline ? 'En línea' : 'Desconectado'}
                  </Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <MaterialIcons name="location-on" size={16} color={colors.textMuted} />
                <Text style={styles.infoCoords}>
                  {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
                </Text>
              </View>
              {selected.locationUpdatedAt && (
                <View style={styles.infoRow}>
                  <MaterialIcons name="schedule" size={16} color={colors.textMuted} />
                  <Text style={styles.infoTime}>
                    Actualizado: {new Date(selected.locationUpdatedAt).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: typography.fontSizes.body,
    color: colors.danger,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  chipBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  childChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  childChipText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  childChipTextActive: {
    color: colors.primary,
  },
  infoCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoName: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  onlineBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  onlineText: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
  },
  infoCoords: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  infoTime: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
});
