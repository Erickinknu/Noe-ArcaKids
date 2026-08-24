import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, typography } from '@noe-arcakids/shared';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && (
        <Pressable
          style={({ pressed }) => pressed && styles.actionPressed}
          onPress={action.onPress}
        >
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  action: {
    fontSize: typography.fontSizes.subtitle,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  actionPressed: {
    opacity: 0.7,
  },
});
