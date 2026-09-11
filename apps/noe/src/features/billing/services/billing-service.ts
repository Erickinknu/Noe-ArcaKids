import { PlanLimitError, t } from '@noe-arcakids/shared';

import { billingRepository } from '../repositories/billing-repository';
import { DEFAULT_PLAN, FREE_MAX_BLOCKED_APPS, FREE_MAX_CHILDREN, type PlanId, type SubscriptionStatus } from '../plans';

interface PlanCache {
  plan: PlanId;
  at: number;
}

const CACHE_TTL_MS = 30_000;
let cache: PlanCache | null = null;

export const billingService = {
  async getCurrentPlan(): Promise<PlanId> {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
      return cache.plan;
    }
    let plan: PlanId = DEFAULT_PLAN;
    try {
      const subscription = await billingRepository.getMySubscription();
      if (subscription) {
        plan = subscription.plan;
      }
    } catch {
      // Default to free when billing cannot be reached.
    }
    cache = { plan, at: Date.now() };
    return plan;
  },

  async getSubscription(): Promise<SubscriptionStatus | null> {
    return billingRepository.getMySubscription();
  },

  async claimPlan(plan: PlanId): Promise<SubscriptionStatus> {
    const subscription = await billingRepository.claimPlan(plan);
    cache = { plan: subscription.plan, at: Date.now() };
    return subscription;
  },

  invalidate() {
    cache = null;
  },

  assertUnderChildLimit(childCount: number): void {
    const plan = cache?.plan ?? DEFAULT_PLAN;
    if (plan === 'free' && childCount >= FREE_MAX_CHILDREN) {
      throw new PlanLimitError(
        t('noe.planErrors.childLimit', { max: FREE_MAX_CHILDREN }),
        { code: 'PLAN_CHILD_LIMIT' }
      );
    }
  },

  assertUnderAppLimit(blockedCount: number): void {
    const plan = cache?.plan ?? DEFAULT_PLAN;
    if (plan === 'free' && blockedCount >= FREE_MAX_BLOCKED_APPS) {
      throw new PlanLimitError(
        t('noe.planErrors.appLimit', { max: FREE_MAX_BLOCKED_APPS }),
        { code: 'PLAN_APP_LIMIT' }
      );
    }
  },
};

export function isPaidPlan(plan: PlanId): boolean {
  return plan !== 'free';
}