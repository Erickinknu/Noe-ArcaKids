import type { ChildProfile } from '@noe-arcakids/types';
import { ValidationError, t } from '@noe-arcakids/shared';

import { childRepository } from '../repositories/child-repository';

const MAX_DISPLAY_NAME_LENGTH = 60;

export const childService = {
  listChildren(familyId: string): Promise<ChildProfile[]> {
    return childRepository.listChildren(familyId);
  },

  async addChild(familyId: string, displayName: string): Promise<ChildProfile> {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(t('validation.childNameRequired'));
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.childNameMax', { max: MAX_DISPLAY_NAME_LENGTH })
      );
    }
    return childRepository.addChild(familyId, trimmed);
  },
};