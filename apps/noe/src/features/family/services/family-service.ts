import { ValidationError } from '@noe-arcakids/shared';

import { familyRepository, type MyFamily } from '../repositories/family-repository';

const MAX_FAMILY_NAME_LENGTH = 60;

export const familyService = {
  getMyFamily(): Promise<MyFamily> {
    return familyRepository.getMyFamily();
  },

  async renameFamily(familyId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Family name is required.');
    }
    if (trimmed.length > MAX_FAMILY_NAME_LENGTH) {
      throw new ValidationError(
        `Family name must be at most ${MAX_FAMILY_NAME_LENGTH} characters.`
      );
    }
    await familyRepository.renameFamily(familyId, trimmed);
  },
};