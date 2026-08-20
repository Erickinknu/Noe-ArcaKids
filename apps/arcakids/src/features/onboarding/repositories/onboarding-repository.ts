import { storage } from '@noe-arcakids/storage';

const ONBOARDING_COMPLETE_KEY = 'arcakids/onboarding-complete';

export const onboardingRepository = {
  async isCompleted(): Promise<boolean> {
    return (await storage.get(ONBOARDING_COMPLETE_KEY)) === '1';
  },

  async markCompleted(): Promise<void> {
    await storage.save(ONBOARDING_COMPLETE_KEY, '1');
  },
};