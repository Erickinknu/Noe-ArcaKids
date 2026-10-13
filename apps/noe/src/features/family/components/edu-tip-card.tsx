import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import {
  Card,
  radius,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@noe-arcakids/shared';

const TIP_COUNT = 8;

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000) + 1;
}

export function EduTipCard() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const index = dayOfYear(new Date()) % TIP_COUNT;
  const tip = tr(`noe.eduTips.tip${index + 1}`);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <MaterialIcons name="lightbulb" size={22} color={colors.primary} />
        <Text style={styles.text}>{tip}</Text>
      </View>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    text: {
      flex: 1,
      fontSize: typography.fontSizes.body,
      lineHeight: 22,
      color: colors.text,
    },
  });
