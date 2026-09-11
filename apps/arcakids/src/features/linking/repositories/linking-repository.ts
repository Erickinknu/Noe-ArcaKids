import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import type { LocalDevice } from '../../identity/repositories/identity-repository';

export interface RedeemResult {
  childId: string;
  displayName: string;
  avatarUrl: string | null;
  familyId: string;
}

export const linkingRepository = {
  async redeem(code: string, device: LocalDevice): Promise<RedeemResult> {
    const client = requireSupabaseClient();
    // Rate limiting for redeem cannot live inside a PostgREST RPC: an error
    // aborts the whole transaction, rolling back the throttle ledger. Calls
    // go through the redeem-pair edge function, which keeps its throttles in
    // separate committed DB transactions and translates RPC errors to HTTP.
    const { data, error } = await client.functions.invoke('redeem-pair', {
      body: {
        code,
        deviceUuid: device.deviceUuid,
        deviceName: device.name,
        platform: device.platform,
      },
    });

    if (error) {
      let payload: { error?: { code?: string; message?: string } } = {};
      try {
        const response = (error.context ?? error.response) as Response | undefined;
        if (response?.json) payload = await response.clone().json();
      } catch {
        /* keep defaults */
      }
      const serverMessage = payload.error?.message;
      const message = typeof serverMessage === 'string' && serverMessage.length > 0 ? serverMessage : 'The code could not be redeemed.';
      throw new DatabaseError(message, { code: payload.error?.code, cause: error });
    }
    if (!data || typeof data !== 'object') {
      throw new DatabaseError('The code could not be redeemed.');
    }
    return {
      childId: String(data.childId ?? ''),
      displayName: String(data.displayName ?? ''),
      avatarUrl: data.avatarUrl == null ? null : String(data.avatarUrl),
      familyId: String(data.familyId ?? ''),
    };
  },
};