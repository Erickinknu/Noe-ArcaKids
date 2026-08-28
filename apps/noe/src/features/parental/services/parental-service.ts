import type { BlockedApp, ParentalRules } from '@noe-arcakids/types';
import { ValidationError, checkRateLimit, t } from '@noe-arcakids/shared';

import {
  parentalRepository,
  type ParentalRulesPatch,
} from '../repositories/parental-repository';

const MAX_DAILY_LIMIT_MINUTES = 1440;
const MAX_PACKAGE_NAME_LENGTH = 200;
const MAX_APP_LABEL_LENGTH = 100;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PACKAGE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/;

export interface SaveRulesInput {
  dailyLimitMinutes?: number | null;
  bedtimeEnabled?: boolean;
  bedtimeStart?: string | null;
  bedtimeEnd?: string | null;
}

function assertValidTime(value: string | null | undefined): void {
  if (value === null || value === undefined || value === '') {
    return;
  }
  if (!TIME_PATTERN.test(value)) {
    throw new ValidationError(t('validation.rules.timeInvalid'));
  }
}

export const parentalService = {
  getRulesByChild(childId: string): Promise<ParentalRules | null> {
    return parentalRepository.getRulesByChild(childId);
  },

  async saveRules(
    familyId: string,
    childId: string,
    input: SaveRulesInput
  ): Promise<ParentalRules> {
    checkRateLimit('saveRules');
    const patch: ParentalRulesPatch = {};

    if (input.dailyLimitMinutes !== undefined) {
      const minutes = input.dailyLimitMinutes;
      if (minutes !== null && (!Number.isInteger(minutes) || minutes < 0 || minutes > MAX_DAILY_LIMIT_MINUTES)) {
        throw new ValidationError(t('validation.rules.dailyLimitInvalid'));
      }
      patch.dailyLimitMinutes = minutes;
    }

    if (input.bedtimeEnabled !== undefined) {
      patch.bedtimeEnabled = input.bedtimeEnabled;
    }

    if (input.bedtimeStart !== undefined) {
      assertValidTime(input.bedtimeStart);
      patch.bedtimeStart = input.bedtimeStart || null;
    }

    if (input.bedtimeEnd !== undefined) {
      assertValidTime(input.bedtimeEnd);
      patch.bedtimeEnd = input.bedtimeEnd || null;
    }

    if (patch.bedtimeEnabled) {
      if (!patch.bedtimeStart || !patch.bedtimeEnd) {
        throw new ValidationError(t('validation.rules.bedtimeIncomplete'));
      }
      if (patch.bedtimeStart === patch.bedtimeEnd) {
        throw new ValidationError(t('validation.rules.bedtimeSame'));
      }
    }

    return parentalRepository.upsertRules(familyId, childId, patch);
  },

  listBlockedApps(childId: string): Promise<BlockedApp[]> {
    return parentalRepository.listBlockedApps(childId);
  },

  async addBlockedApp(
    familyId: string,
    childId: string,
    packageName: string,
    appLabel: string
  ): Promise<BlockedApp> {
    checkRateLimit('addBlockedApp');
    const pkg = packageName.trim();
    const label = appLabel.trim() || pkg;

    if (pkg.length === 0 || pkg.length > MAX_PACKAGE_NAME_LENGTH || !PACKAGE_NAME_PATTERN.test(pkg)) {
      throw new ValidationError(t('validation.rules.packageNameInvalid'));
    }
    if (label.length > MAX_APP_LABEL_LENGTH) {
      throw new ValidationError(t('validation.rules.appLabelMax', { max: MAX_APP_LABEL_LENGTH }));
    }

    return parentalRepository.addBlockedApp(familyId, childId, pkg, label);
  },

  async removeBlockedApp(id: string): Promise<void> {
    checkRateLimit('removeBlockedApp');
    return parentalRepository.removeBlockedApp(id);
  },
};
