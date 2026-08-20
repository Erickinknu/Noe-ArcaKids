import {
  ValidationError,
  isValidEmail,
  isNonEmptyString,
  normalizeEmail,
  t,
} from '@noe-arcakids/shared';

import { authRepository } from '../repositories/auth-repository';

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  displayName?: string;
}

function validateCredentials(email: string, password: string): void {
  if (!isValidEmail(email)) {
    throw new ValidationError(t('validation.emailRequired'));
  }
  if (!isNonEmptyString(password)) {
    throw new ValidationError(t('validation.passwordRequired'));
  }
}

export const authService = {
  async signIn(input: SignInInput): Promise<void> {
    const email = normalizeEmail(input.email);
    validateCredentials(email, input.password);
    await authRepository.signInWithPassword(email, input.password);
  },

  async signUp(input: SignUpInput): Promise<void> {
    const email = normalizeEmail(input.email);
    validateCredentials(email, input.password);
    await authRepository.signUp(email, input.password, input.displayName?.trim());
  },

  async signOut(): Promise<void> {
    await authRepository.signOut();
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    const normalized = normalizeEmail(email);
    if (!isValidEmail(normalized)) {
      throw new ValidationError(t('validation.emailRequired'));
    }
    await authRepository.resetPasswordForEmail(normalized);
  },
};