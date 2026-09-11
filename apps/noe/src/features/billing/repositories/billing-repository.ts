import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { PlanId, SubscriptionStatus } from '../plans';

interface SubscriptionRow {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  provider: string;
  product_id: string;
}

function mapRow(row: SubscriptionRow): SubscriptionStatus {
  return {
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    provider: row.provider,
    productId: row.product_id,
  };
}

export const billingRepository = {
  async getMySubscription(): Promise<SubscriptionStatus | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_my_subscription');
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as SubscriptionRow[];
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async claimPlan(plan: PlanId): Promise<SubscriptionStatus> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('claim_subscription', { p_plan: plan });
    if (error) throw new DatabaseError(error.message);
    return mapRow(data as SubscriptionRow);
  },
};