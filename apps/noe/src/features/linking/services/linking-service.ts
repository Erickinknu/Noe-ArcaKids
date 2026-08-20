import type { PairingCode } from '../repositories/linking-repository';
import { linkingRepository } from '../repositories/linking-repository';

export const linkingService = {
  createPairingCode(familyId: string, childId: string): Promise<PairingCode> {
    return linkingRepository.createPairingCode(familyId, childId);
  },
};