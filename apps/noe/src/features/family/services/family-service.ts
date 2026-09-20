import { ValidationError, t } from '@noe-arcakids/shared';
import type { FamilyMode } from '@noe-arcakids/types';

import { familyRepository, type MyFamily } from '../repositories/family-repository';

const MAX_FAMILY_NAME_LENGTH = 60;
const FAMILY_MODES: FamilyMode[] = ['general', 'cristiano', 'educativo'];

export const familyService = {
  getMyFamily(): Promise<MyFamily> {
    return familyRepository.getMyFamily();
  },

  async renameFamily(familyId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      throw new ValidationError(t('validation.familyNameRequired'));
    }
    if (trimmed.length > MAX_FAMILY_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.familyNameMax', { max: MAX_FAMILY_NAME_LENGTH })
      );
    }
    await familyRepository.renameFamily(familyId, trimmed);
  },

  async setFamilyMode(familyId: string, mode: FamilyMode): Promise<void> {
    if (!FAMILY_MODES.includes(mode)) {
      throw new ValidationError(t('noe.familyMode.general'));
    }
    await familyRepository.setFamilyMode(familyId, mode);
  },
};