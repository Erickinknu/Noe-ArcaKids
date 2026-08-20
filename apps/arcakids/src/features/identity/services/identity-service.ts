import { ValidationError, t } from '@noe-arcakids/shared';

import {
  identityRepository,
  type ChildInfo,
  type LocalDevice,
} from '../repositories/identity-repository';

const MAX_NAME_LENGTH = 60;
const DEFAULT_AVATAR = '🦊';

export const identityService = {
  getLocalDevice(): Promise<LocalDevice> {
    return identityRepository.getLocalDevice();
  },

  getChildInfo(): Promise<ChildInfo | null> {
    return identityRepository.getChildInfo();
  },

  isLinked(info: ChildInfo | null): info is ChildInfo & { childId: string; familyId: string } {
    return Boolean(info && info.childId && info.familyId);
  },

  async saveChildProfile(input: { name: string; avatar?: string }): Promise<void> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new ValidationError(t('validation.childNameRequired'));
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.childNameMax', { max: MAX_NAME_LENGTH })
      );
    }
    const avatar = input.avatar?.trim() || DEFAULT_AVATAR;
    const current = await identityRepository.getChildInfo();
    await identityRepository.saveChildInfo({ ...(current ?? {}), name, avatar });
  },

  async saveChildLink(input: {
    childId: string;
    familyId: string;
    displayName: string;
    avatar?: string;
  }): Promise<void> {
    const current = await identityRepository.getChildInfo();
    await identityRepository.saveChildInfo({
      name: current?.name ?? input.displayName,
      avatar: input.avatar || current?.avatar || DEFAULT_AVATAR,
      childId: input.childId,
      familyId: input.familyId,
      linkedAt: new Date().toISOString(),
    });
  },
};