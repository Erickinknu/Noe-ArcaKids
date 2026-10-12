import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { PlanId, PlanLimits, SubscriptionStatus } from '../plans';

interface SubscriptionRow {
  plan: PlanId;
  status: string;
  current_period_end: string | null;
  provider: string;
  product_id: string;
}

interface PlanLimitsRow {
  slug: PlanId;
  max_children: number | null;
  max_tutors: number | null;
  max_devices: number | null;
  status: string;
  current_period_end: string | null;
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

  /**
   * Límites efectivos del plan de la familia (RPC get_family_plan_limits, que
   * ya cae al plan gratuito cuando aún no existe fila en subscriptions).
   */
  async getFamilyPlanLimits(familyId: string): Promise<PlanLimits | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_family_plan_limits', {
      _family_id: familyId,
    });
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as PlanLimitsRow[];
    const row = rows[0];
    if (!row) return null;
    return {
      plan: row.slug,
      maxChildren: row.max_children,
      maxTutors: row.max_tutors,
      maxDevices: row.max_devices,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
    };
  },
};