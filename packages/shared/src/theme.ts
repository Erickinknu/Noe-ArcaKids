import { Platform, type ViewStyle } from 'react-native';

export type AppColorTheme = 'light' | 'dark' | 'system';

export type AppPalette = 'default' | 'noe';

const lightColors = {
  primary: '#1D4ED8',
  primaryLight: '#DBEAFE',
  onPrimary: '#FFFFFF',
  secondary: '#059669',
  secondaryLight: '#D1FAE5',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceHover: '#EEF0F4',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F0F1F3',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  overlay: 'rgba(0,0,0,0.4)',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',
  inputRadius: 10,
  inputMinHeight: 48,
} as const;

// Paleta NOE profesional y cálida: azul rey + esmeralda + ámbar sobre fondo
// gris-azulado limpio (sin beige). Se activa con <ThemeProvider app="noe">.
const noeLightColors = {
  primary: '#1D4ED8',
  primaryLight: '#DBEAFE',
  onPrimary: '#FFFFFF',
  secondary: '#059669',
  secondaryLight: '#D1FAE5',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  background: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceHover: '#E4EAF2',
  text: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderLight: '#EDF1F6',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  overlay: 'rgba(15, 23, 42, 0.45)',
  inputBorder: '#CBD5E1',
  inputPlaceholder: '#94A3B8',
  inputRadius: 12,
  inputMinHeight: 48,
} as const;

const darkColors = {
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  onPrimary: '#0F172A',
  secondary: '#34D399',
  secondaryLight: '#064E3B',
  accent: '#FBBF24',
  accentLight: '#451A03',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceHover: '#334155',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#334155',
  borderLight: '#1E293B',
  danger: '#F87171',
  dangerLight: '#450A0A',
  success: '#34D399',
  successLight: '#064E3B',
  warning: '#FBBF24',
  warningLight: '#451A03',
  overlay: 'rgba(0,0,0,0.6)',
  inputBorder: '#475569',
  inputPlaceholder: '#64748B',
  inputRadius: 10,
  inputMinHeight: 48,
} as const;

export const colors = lightColors;

// Static warm palette para NOE (uso fuera del hook useTheme, ej. location).
export const noeColors = noeLightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const typography = {
  // Brand fonts (design-system MASTER.md): Lexend for headings, Source Sans 3 for body.
  // When custom .ttf assets are added, load them via expo-font and point these names
  // to the loaded family. Falls back to the platform default stack otherwise.
  fontFamily: {
    heading: undefined as string | undefined,
    body: undefined as string | undefined,
    mono: 'monospace',
  },
  fontSizes: {
    caption: 12,
    subtitle: 14,
    body: 16,
    title: 20,
    heading: 28,
    display: 34,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

const lightShadows = Platform.select({
  ios: {
    sm: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    } as ViewStyle,
    lg: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    } as ViewStyle,
  },
  android: {
    sm: { elevation: 1 },
    md: { elevation: 4 },
    lg: { elevation: 8 },
  },
  default: {
    sm: { elevation: 1 },
    md: { elevation: 4 },
    lg: { elevation: 8 },
  },
}) as { sm: ViewStyle; md: ViewStyle; lg: ViewStyle };

export const shadows = lightShadows;

export const colorThemes = {
  light: lightColors,
  dark: darkColors,
};

export const noeColorThemes = {
  light: noeLightColors,
  dark: darkColors,
};

export const getColors = (palette: AppPalette, theme: AppColorTheme) => {
  if (palette === 'noe') {
    return theme === 'dark' ? darkColors : noeLightColors;
  }
  return theme === 'dark' ? darkColors : lightColors;
};

export const getShadowsForScheme = (scheme: 'light' | 'dark') => {
  if (scheme === 'dark') {
    return Platform.select({
      ios: {
        sm: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 2,
        } as ViewStyle,
        md: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
        } as ViewStyle,
        lg: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.25,
          shadowRadius: 24,
        } as ViewStyle,
      },
      android: {
        sm: { elevation: 1 },
        md: { elevation: 4 },
        lg: { elevation: 8 },
      },
      default: {
        sm: { elevation: 1 },
        md: { elevation: 4 },
        lg: { elevation: 8 },
      },
    });
  }
  return shadows;
};

export type ThemeResolvedScheme = 'light' | 'dark';

type InputDimensionKeys = 'inputRadius' | 'inputMinHeight';
export type ThemeColors = {
  [K in keyof typeof lightColors as K extends InputDimensionKeys ? never : K]: string;
} & {
  [K in InputDimensionKeys]: number;
};

export type ThemeShadows = ReturnType<typeof getShadowsForScheme>;

export interface ThemeDeps {
  colors: ThemeColors;
  shadows: ThemeShadows;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export interface ThemeContextValue {
  theme: AppColorTheme;
  resolved: ThemeResolvedScheme;
  app: AppPalette;
  colors: ThemeColors;
  shadows: ThemeShadows;
  deps: ThemeDeps;
  setTheme: (t: AppColorTheme) => void;
}

