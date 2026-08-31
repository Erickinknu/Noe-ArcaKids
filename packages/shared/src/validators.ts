import { SECURITY_CONFIG } from './security';
import { t } from './i18n';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

export function isNonEmptyString(value: string): boolean {
  return value.trim().length > 0;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ── Validation helpers (return error message or null) ──

export function validatePassword(value: string): string | null {
  if (!value) return t('validation.passwordRequired');
  if (value.length < SECURITY_CONFIG.minPasswordLength) {
    return t('validation.passwordMinLength', { min: SECURITY_CONFIG.minPasswordLength });
  }
  if (value.length > SECURITY_CONFIG.maxPasswordLength) {
    return t('validation.passwordMaxLength', { max: SECURITY_CONFIG.maxPasswordLength });
  }
  if (SECURITY_CONFIG.requireUppercase && !/[A-Z]/.test(value)) {
    return t('validation.passwordUppercase');
  }
  if (SECURITY_CONFIG.requireNumber && !/[0-9]/.test(value)) {
    return t('validation.passwordNumber');
  }
  return null;
}