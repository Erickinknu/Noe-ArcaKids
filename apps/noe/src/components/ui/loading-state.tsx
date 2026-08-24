import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@noe-arcakids/shared';

interface LoadingStateProps {
  text?: string;
}

export function LoadingState({ text }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  text: {
    marginTop: spacing.md,
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
  },
});
