import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useTheme, useRandomVerse, VerseBanner, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function BlockedScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const verse = useRandomVerse(['rest', 'hope'] as const);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.iconBox}>
        <MaterialIcons name="lock" size={64} color={colors.danger} />
      </View>
      <Text style={styles.title}>{tr('arcakids.blocked.title')}</Text>
      <Text style={styles.subtitle}>{tr('arcakids.blocked.body')}</Text>
      {verse ? (
        <View style={styles.banner}>
          <VerseBanner verse={verse} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.dangerLight,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
      gap: spacing.lg,
    },
    iconBox: {
      width: 120,
      height: 120,
      borderRadius: radius.full,
      backgroundColor: colors.dangerLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.danger,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 24,
    },
    banner: {
      alignSelf: 'stretch',
    },
  });
