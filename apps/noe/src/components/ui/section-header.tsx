import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    title: {
      fontFamily: typography.fontFamily.heading,
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.bold,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    action: {
      fontSize: typography.fontSizes.caption,
      color: colors.primary,
      fontWeight: typography.fontWeights.medium,
    },
    actionPressed: {
      opacity: 0.7,
    },
  });
