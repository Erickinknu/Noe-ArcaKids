import type { ChildProfile } from '@noe-arcakids/types';

import { childRepository } from '../repositories/child-repository';

export const childService = {
  listChildren(familyId: string): Promise<ChildProfile[]> {
    return childRepository.listChildren(familyId);
  },
};