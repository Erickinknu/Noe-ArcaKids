import i18next from 'i18next';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../theme-context';
import { radius, spacing, typography } from '../theme';
import type { BibleVerse } from '../verses/types';

type VerseLocale = 'es' | 'en';

function resolveLocale(): VerseLocale {
  const raw = i18next.language ?? '';
  return raw.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export interface VerseTextProps {
  verse: BibleVerse;
  showReference?: boolean;
  style?: StyleProp<TextStyle>;
}

export function VerseText({ verse, showReference = true, style }: VerseTextProps) {
  const { colors } = useTheme();
  const locale = resolveLocale();
  const entry = verse[locale];

  return (
    <View>
      <Text style={[styles.text, { color: colors.text }, style]}>“{entry.text}”</Text>
      {showReference ? (
        <Text style={[styles.reference, { color: colors.textMuted }]}>
          — {entry.reference}
        </Text>
      ) : null}
    </View>
  );
}

export interface VerseBannerProps {
  verse: BibleVerse;
  title?: string;
  style?: StyleProp<TextStyle>;
}

export function VerseBanner({ verse, title, style }: VerseBannerProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        { borderColor: colors.border, backgroundColor: colors.primaryLight },
      ]}
    >
      {title ? (
        <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      ) : null}
      <VerseText verse={verse} style={style} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
  },
  text: {
    fontSize: typography.fontSizes.body,
  },
  reference: {
    fontSize: typography.fontSizes.caption,
    marginTop: spacing.xs,
    textAlign: 'right',
  },
});