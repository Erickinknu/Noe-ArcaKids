import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, typography } from '@noe-arcakids/shared';

interface StatusDotProps {
  online: boolean;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function StatusDot({ online, showLabel = false, label, size = 'md' }: StatusDotProps) {
  const { t } = useTranslation();
  const dotSize = size === 'sm' ? 8 : 12;
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: online ? colors.success : colors.danger,
          },
        ]}
      />
      {showLabel ? (
        <Text style={styles.label}>
          {label ?? (online ? t('noe.dashboard.online') : t('noe.dashboard.statusOffline'))}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {},
  label: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
});
