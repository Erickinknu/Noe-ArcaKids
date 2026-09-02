import { ValidationError } from '@noe-arcakids/shared';

import { profileRepository } from '../repositories/profile-repository';

const MAX_DISPLAY_NAME_LENGTH = 60;

export const profileService = {
  async updateDisplayName(profileId: string, displayName: string): Promise<void> {
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('El nombre no puede estar vacío');
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new ValidationError(`El nombre no puede superar los ${MAX_DISPLAY_NAME_LENGTH} caracteres`);
    }
    await profileRepository.updateDisplayName(profileId, trimmed);
  },

  async updateBlockInstalls(profileId: string, blockInstalls: boolean): Promise<void> {
    await profileRepository.updateBlockInstalls(profileId, Boolean(blockInstalls));
  },

  async getBlockInstalls(profileId: string): Promise<boolean> {
    return profileRepository.getBlockInstalls(profileId);
  },
};