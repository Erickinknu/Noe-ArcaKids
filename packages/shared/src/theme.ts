import { Platform, type ViewStyle } from 'react-native';

const lightColors = {
  primary: '#2F6BFF',
  primaryLight: '#EBF2FF',
  onPrimary: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F5F6F8',
  surfaceHover: '#EEF0F4',
  text: '#111827',
  textSecondary: '#374151',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  borderLight: '#F0F1F3',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  success: '#16A34A',
  successLight: '#F0FDF4',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

const darkColors = {
  primary: '#60A5FA',
  primaryLight: '#1E3A5F',
  onPrimary: '#0F172A',
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
  success: '#22C55E',
  successLight: '#052E16',
  warning: '#FBBF24',
  warningLight: '#451A03',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const colors = lightColors;

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
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const typography = {
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    } as ViewStyle,
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    } as ViewStyle,
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    } as ViewStyle,
  },
  android: {
    sm: { elevation: 1 },
    md: { elevation: 3 },
    lg: { elevation: 6 },
  },
  default: {
    sm: { elevation: 1 },
    md: { elevation: 3 },
    lg: { elevation: 6 },
  },
}) as { sm: ViewStyle; md: ViewStyle; lg: ViewStyle };

export const shadows = lightShadows;
