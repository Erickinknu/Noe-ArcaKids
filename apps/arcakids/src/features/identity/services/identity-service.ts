import type { Device } from '@noe-arcakids/types';
import { ValidationError } from '@noe-arcakids/shared';

import {
  identityRepository,
  type ChildInfo,
} from '../repositories/identity-repository';

const MAX_NAME_LENGTH = 60;
const DEFAULT_AVATAR = '🦊';

export const identityService = {
  getDevice(): Promise<Device | null> {
    return identityRepository.getDevice();
  },

  getChildInfo(): Promise<ChildInfo | null> {
    return identityRepository.getChildInfo();
  },

  async saveChildInfo(input: { name: string; avatar?: string }): Promise<void> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new ValidationError('Child name is required.');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationError(
        `Child name must be at most ${MAX_NAME_LENGTH} characters.`
      );
    }
    const avatar = input.avatar?.trim() || DEFAULT_AVATAR;
    await identityRepository.saveChildInfo({ name, avatar });
  },
};