export const colors = {
  primary: '#2F6BFF',
  onPrimary: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F5F6F8',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
} as const;

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