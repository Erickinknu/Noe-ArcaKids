import type { ChildProfile } from '@noe-arcakids/types';
import { ValidationError } from '@noe-arcakids/shared';

import { childRepository } from '../repositories/child-repository';

const MAX_DISPLAY_NAME_LENGTH = 60;

export const childService = {
  listChildren(familyId: string): Promise<ChildProfile[]> {
    return childRepository.listChildren(familyId);
  },

  async addChild(familyId: string, displayName: string): Promise<ChildProfile> {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Child name is required.');
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(
        `Child name must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`
      );
    }
    return childRepository.addChild(familyId, trimmed);
  },
};