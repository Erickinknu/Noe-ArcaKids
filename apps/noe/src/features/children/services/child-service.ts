import type { ChildProfile } from '@noe-arcakids/types';
import { ValidationError, checkRateLimit, t } from '@noe-arcakids/shared';

import { billingService } from '../../billing/services/billing-service';
import { childRepository } from '../repositories/child-repository';
import { isValidBirthDate } from '../utils/child-age';

const MAX_DISPLAY_NAME_LENGTH = 60;

export const childService = {
  listChildren(familyId: string): Promise<ChildProfile[]> {
    return childRepository.listChildren(familyId);
  },

  async addChild(
    familyId: string,
    displayName: string,
    avatarUrl?: string,
    birthDate?: string | null
  ): Promise<ChildProfile> {
    checkRateLimit('addChild');
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(t('validation.childNameRequired'));
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.childNameMax', { max: MAX_DISPLAY_NAME_LENGTH })
      );
    }
    const validatedBirthDate = birthDate ? this.validateBirthDate(birthDate) : null;
    const plan = await billingService.getCurrentPlan();
    if (plan === 'free') {
      const existing = await childRepository.listChildren(familyId);
      billingService.assertUnderChildLimit(existing.length);
    }
    return childRepository.addChild(familyId, trimmed, avatarUrl ?? null, validatedBirthDate);
  },

  async updateChild(
    childId: string,
    displayName: string,
    avatarUrl: string,
    birthDate?: string | null
  ): Promise<ChildProfile> {
    checkRateLimit('updateChild');
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(t('validation.childNameRequired'));
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.childNameMax', { max: MAX_DISPLAY_NAME_LENGTH })
      );
    }
    const validatedBirthDate = birthDate ? this.validateBirthDate(birthDate) : null;
    return childRepository.updateChild(childId, trimmed, avatarUrl, validatedBirthDate);
  },

  validateBirthDate(birthDate: string): string {
    if (!isValidBirthDate(birthDate)) {
      throw new ValidationError(t('validation.birthDateInvalid'));
    }
    return birthDate;
  },

  removeChild(childId: string): Promise<void> {
    checkRateLimit('removeChild');
    return childRepository.removeChild(childId);
  },
};