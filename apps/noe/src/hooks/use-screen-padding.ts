import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@noe-arcakids/shared';

/**
 * Returns screen-level padding that respects device safe areas.
 * Use as contentContainerStyle for ScrollView screens.
 */
export function useScreenPadding() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  } as const;
}
