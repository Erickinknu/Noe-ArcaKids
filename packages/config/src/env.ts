export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  isSupabaseConfigured: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ),
  // App environment: 'development' | 'staging' | 'production'. Folder set from EXPO_PUBLIC_APP_ENV.
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? (process.env.NODE_ENV !== 'production' ? 'development' : 'production')) as
    | 'development'
    | 'staging'
    | 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  // Sentry is optional: set EXPO_PUBLIC_SENTRY_DSN (EAS secret for store builds) to enable crash reporting.
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  isSentryConfigured: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
} as const;