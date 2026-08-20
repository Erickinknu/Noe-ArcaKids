import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { setLanguage } from '@/i18n';
import {
  LANGUAGE_NAMES,
  SUPPORTED_LANGUAGES,
  colors,
  radius,
  spacing,
  typography,
  type SupportedLanguage,
} from '@noe-arcakids/shared';

export default function SettingsScreen() {
  const { t: tr, i18n } = useTranslation();
  const [current, setCurrent] = useState<SupportedLanguage>(i18n.language as SupportedLanguage);

  function handleSelect(lng: SupportedLanguage) {
    setLanguage(lng);
    setCurrent(lng);
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('noe.dashboard.settings')}</Text>
      <Card>
        <Text style={styles.cardTitle}>{tr('settings.language')}</Text>
        <Text style={styles.cardDescription}>
          {tr('settings.languageDescription')}
        </Text>
        <View style={styles.options}>
          {SUPPORTED_LANGUAGES.map((lng) => {
            const selected = lng === current;
            return (
              <Pressable
                key={lng}
                onPress={() => handleSelect(lng)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {LANGUAGE_NAMES[lng]}
                </Text>
                {selected ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  cardDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  check: {
    fontSize: typography.fontSizes.body,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
});