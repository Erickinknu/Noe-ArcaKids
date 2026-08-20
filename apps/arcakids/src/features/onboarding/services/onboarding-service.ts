import { onboardingRepository } from '../repositories/onboarding-repository';

export const onboardingService = {
  isCompleted(): Promise<boolean> {
    return onboardingRepository.isCompleted();
  },

  markCompleted(): Promise<void> {
    return onboardingRepository.markCompleted();
  },
};