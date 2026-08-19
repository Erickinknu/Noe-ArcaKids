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