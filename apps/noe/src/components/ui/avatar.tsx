import { View, Text, StyleSheet, type ViewStyle } from 'react-native';

import { typography } from '@noe-arcakids/shared';

interface AvatarProps {
  name: string;
  emoji?: string;
  size?: number;
  style?: ViewStyle;
}

function colorForName(name: string): string {
  const palette = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997;
  }
  return palette[hash % palette.length];
}

export function Avatar({ name, emoji, size = 48, style }: AvatarProps) {
  const fontSize = size * 0.5;
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: emoji ? 'transparent' : colorForName(name),
        },
        style,
      ]}
    >
      <Text style={[styles.emoji, { fontSize: emoji ? fontSize : fontSize * 0.8 }]}>
        {emoji ?? name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    color: '#FFFFFF',
    fontWeight: typography.fontWeights.bold,
  },
});
