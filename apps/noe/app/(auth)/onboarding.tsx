import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: 'limits',
    icon: 'timer',
    title: 'Tiempo y l�mites',
    subtitle: 'Establece l�mites de tiempo y restricciones de forma clara y sencilla.',
  },
  {
    id: 'protection',
    icon: 'location-on',
    title: 'Protecci�n y ubicaci�n',
    subtitle: 'Cuida y localiza con herramientas pensadas para acompa�ar.',
  },
  {
    id: 'transparency',
    icon: 'visibility',
    title: 'Acompa�ar sin espiar',
    subtitle: 'Todo con transparencia: el ni�o/a conoce la app y acepta permisos.',
  },
];

const ONBOARDING_KEY = 'noe_onboarding_seen_v1';

const VIEWABILITY_CONFIG = { viewAreaCoveragePercentThreshold: 50 } as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setIndex(viewableItems[0].index ?? 0);
      }
    },
    []
  );

  async function finish() {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch {}
    router.replace('/(auth)/welcome');
  }

  async function skip() {
    await finish();
  }

  function next() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
    } else {
      finish();
    }
  }

  return (
    <View style={styles.screen}>
      <Pressable style={styles.skip} onPress={skip}>
        <Text style={styles.skipText}>Saltar</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VIEWABILITY_CONFIG}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}>
              <MaterialIcons name={item.icon} size={64} color={colors.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && { backgroundColor: colors.primary, width: 24 }]}
            />
          ))}
        </View>
        <Pressable style={styles.nextBtn} onPress={next}>
          <Text style={styles.nextText}>{index === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skip: {
      position: 'absolute',
      top: spacing.xl + spacing.md,
      right: spacing.lg,
      zIndex: 1,
    },
    skipText: {
      color: colors.textMuted,
      fontSize: typography.fontSizes.body,
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.md,
    },
    iconWrap: {
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    nextBtn: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      borderRadius: 12,
      alignItems: 'center',
    },
    nextText: {
      color: colors.surface,
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.medium,
    },
  });
