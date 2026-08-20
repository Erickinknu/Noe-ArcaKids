import { ValidationError, t } from '@noe-arcakids/shared';

import { identityRepository } from '../../identity/repositories/identity-repository';
import { identityService } from '../../identity/services/identity-service';
import { linkingRepository, type RedeemResult } from '../repositories/linking-repository';

const CODE_PATTERN = /^\d{6}$/;

function sanitizeCode(input: string): string {
  return input.replace(/\D/g, '').slice(0, 6);
}

export const linkingService = {
  sanitizeCode,

  async redeem(code: string): Promise<RedeemResult> {
    const normalized = sanitizeCode(code);
    if (!CODE_PATTERN.test(normalized)) {
      throw new ValidationError(t('validation.linkCodeInvalid'));
    }

    const device = await identityRepository.getLocalDevice();
    const result = await linkingRepository.redeem(normalized, device);

    await identityService.saveChildLink({
      childId: result.childId,
      familyId: result.familyId,
      displayName: result.displayName,
      avatar: result.avatarUrl ?? undefined,
    });

    return result;
  },
};