export const LAST_EMAIL_KEY = 'noe_last_email';
export const SETUP_PENDING_KEY = 'noe_setup_pending';
export const ONBOARDING_KEY = 'noe_onboarding_seen_v1';

export const ROUTES = {
  auth: '/(auth)',
  app: '/(app)',
  onboarding: '/(auth)/onboarding',
  login: '/(auth)/login',
  register: '/(auth)/register',
  forgotPassword: '/(auth)/forgot-password',
  resetPassword: '/(auth)/reset-password',
  children: '/children',
  linking: '/linking',
  rules: '/rules',
  activity: '/activity',
  profile: '/profile',
  profileNotifications: '/profile/notifications',
  notifications: '/notifications',
} as const;