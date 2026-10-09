import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { radius, spacing, typography, useTheme, type ThemeColors } from '@noe-arcakids/shared';

export function ScreenHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        style={styles.backButton}
        accessibilityRole="button"
      >
        <Text style={styles.backText}>←</Text>
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: {
      fontSize: 20,
      color: colors.text,
      fontWeight: typography.fontWeights.bold,
    },
    title: {
      flex: 1,
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    right: {
      marginLeft: 'auto',
    },
  });
