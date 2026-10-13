import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { OSMMap } from '@/components/ui/osm-map';
import { Card, radius, spacing, typography, useTheme, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface LocationMiniCardProps {
  childName: string;
  latitude: number | null;
  longitude: number | null;
  online: boolean;
  onOpenMap: () => void;
}

export function LocationMiniCard({ childName, latitude, longitude, online, onOpenMap }: LocationMiniCardProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);

  const hasLocation = latitude != null && longitude != null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
          <MaterialIcons name="location-on" size={22} color={colors.primary} />
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {tr('noe.control.whereIs', { name: childName })}
        </Text>
      </View>

      {hasLocation ? (
        <View style={styles.mapWrap}>
          <View style={styles.mapFrozen} pointerEvents="none">
            <OSMMap
              style={styles.map}
              region={{ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              markers={[
                {
                  id: 'child',
                  latitude,
                  longitude,
                  title: childName,
                  color: online ? colors.success : colors.textMuted,
                },
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('noe.control.openMap')}
            style={styles.mapOverlay}
            onPress={onOpenMap}
          />
        </View>
      ) : (
        <Text style={styles.empty}>{tr('noe.control.noLocation')}</Text>
      )}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.openRow, pressed && styles.openRowPressed]}
        onPress={onOpenMap}
      >
        <Text style={styles.openText}>{tr('noe.control.openMap')}</Text>
        <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
      </Pressable>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    card: { gap: spacing.md, ...shadows.sm },
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    mapWrap: {
      position: 'relative',
      height: 150,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapFrozen: { flex: 1 },
    map: { flex: 1 },
    mapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    empty: { fontSize: typography.fontSizes.body, color: colors.textMuted },
    openRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    openRowPressed: { opacity: 0.7 },
    openText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.primary,
    },
  });
