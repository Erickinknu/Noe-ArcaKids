/**
 * Brand fonts for NOE + ARCA KIDS (Lexend for headings, Source Sans 3 for body)
 * per design-system MASTER.md.
 *
 * Usage: the app bundles the .ttf assets, then calls
 *   setupFonts({
 *     Lexend: require('./assets/fonts/Lexend-Regular.ttf'),
 *     SourceSans3: require('./assets/fonts/SourceSans3-Regular.ttf'),
 *   })
 * from the root layout before rendering. If no fonts are supplied or loading
 * fails, the app continues on the platform default font stack.
 */

/** Compatible with expo-font's FontSource (number | string | Record). */
export type AppFontSource =
  | number
  | string
  | { uri?: string; default?: string };

export async function setupFonts(
  assets?: Record<string, AppFontSource>
): Promise<void> {
  if (!assets) {
    return;
  }
  try {
    const Font = await import('expo-font');
    await Font.loadAsync(assets);
  } catch {
    // Missing assets or expo-font unavailable: keep system fonts.
  }
}

/** Idempotent no-op kept for callers that have no bundled font assets yet. */
export async function setupFontsSafely(..._args: unknown[]): Promise<void> {
  return;
}