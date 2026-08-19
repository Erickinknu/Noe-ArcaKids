import type { Device } from '@noe-arcakids/types';

import { identityRepository } from '../repositories/identity-repository';

export const identityService = {
  getDevice(): Promise<Device | null> {
    return identityRepository.getDevice();
  },
};