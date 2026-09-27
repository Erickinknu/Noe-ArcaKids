import type { PostgrestError } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';

import { DatabaseError, SECURITY_CONFIG, t } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

const MAX_CODE_ATTEMPTS = 5;
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export interface PairingCode {
  code: string;
  expiresAt: string;
}

/**
 * Cryptographically secure pairing code using the length declared in SECURITY_CONFIG.
 * Uses expo-crypto (Hermes does not implement globalThis.crypto).
 */
export function generatePairingCode(): string {
  const bytes = Crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.pairingCodeLength));
  return Array.from(bytes, (b) => CODE_CHARSET[b % CODE_CHARSET.length]).join('');
}

function isUniqueViolation(error: PostgrestError | null): boolean {
  return error?.code === '23505';
}

export const linkingRepository = {
  async createPairingCode(
    familyId: string,
    childId: string
  ): Promise<PairingCode> {
    const client = requireSupabaseClient();
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.pairingCodeExpiry).toISOString();

    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generatePairingCode();
      const { error } = await client.from('pairing_codes').insert({
        family_id: familyId,
        child_id: childId,
        code,
        expires_at: expiresAt,
      });

      if (!error) {
        return { code, expiresAt };
      }
      if (!isUniqueViolation(error)) {
        throw new DatabaseError(error.message);
      }
    }

    throw new DatabaseError(t('linking.codeGenerationFailed'));
  },
};