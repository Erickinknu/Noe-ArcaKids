import type { PostgrestError } from '@supabase/supabase-js';

import { DatabaseError, t } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import { getRandomValues } from 'expo-crypto';

const CODE_LIFESPAN_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const CODE_LENGTH = 8;
const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

export interface PairingCode {
  code: string;
  expiresAt: string;
}

/** Cryptographically secure 8-char alphanumeric pairing code. */
export function generatePairingCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  getRandomValues(bytes);
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
    const expiresAt = new Date(Date.now() + CODE_LIFESPAN_MS).toISOString();

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