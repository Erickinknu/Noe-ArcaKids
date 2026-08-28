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

export function validateEmail(value: string): string | null {
  if (!value.trim()) return t('validation.emailRequired');
  if (!isValidEmail(value.trim())) return t('validation.emailInvalid');
  return null;
}

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

export function validateName(value: string): string | null {
  if (!value.trim()) return t('validation.nameRequired');
  if (value.trim().length < 2) return t('validation.nameMinLength', { min: 2 });
  if (value.trim().length > 100) return t('validation.nameMaxLength', { max: 100 });
  return null;
}

export function validatePhone(value: string): string | null {
  if (!value.trim()) return null; // optional
  const phoneRegex = /^\+?[0-9]{7,15}$/;
  if (!phoneRegex.test(value.replace(/[\s\-()]/g, ''))) return t('validation.phoneInvalid');
  return null;
}

export function validateChildName(value: string): string | null {
  if (!value.trim()) return t('validation.childNameRequired');
  if (value.trim().length > 50) return t('validation.childNameMax', { max: 50 });
  return null;
}

export function validateChildAge(value: number): string | null {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value)) return t('validation.childAgeInteger');
  if (value < 0) return t('validation.childAgeMin');
  if (value > 18) return t('validation.childAgeMax');
  return null;
}