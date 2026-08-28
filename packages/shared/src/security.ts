export const SECURITY_CONFIG = {
  // Session
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes

  // Password
  minPasswordLength: 8,
  maxPasswordLength: 128,
  requireUppercase: true,
  requireNumber: true,

  // Data retention
  retention: {
    usageEntries: 90,
    activityLogs: 30,
    syncEvents: 7,
    notifications: 30,
  },

  // API
  rateLimitWindow: 60 * 1000, // 1 minute
  maxRequestsPerWindow: 60,

  // Pairing
  pairingCodeLength: 8,
  pairingCodeExpiry: 15 * 60 * 1000, // 15 minutes
  maxDevicesPerFamily: 5,
} as const;
