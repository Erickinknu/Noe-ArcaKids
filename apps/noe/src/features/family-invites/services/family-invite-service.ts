import { DatabaseError, ValidationError, t } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface FamilyInvite {
  code: string;
  expiresAt: string;
}

export const INVITE_EXPIRES_MINUTES = 72 * 60;

const JOIN_SCHEME = 'noe';

function inviteError(message: string): string {
  const map: Record<string, string> = {
    'invalid code': t('noe.familyInvites.invalidCode'),
    'expired': t('noe.familyInvites.expired'),
    'already used': t('noe.familyInvites.alreadyUsed'),
    'no profile': t('noe.familyInvites.joinError'),
    'not authenticated': t('auth.notAuthenticated'),
    'not allowed': t('noe.familyInvites.joinError'),
  };
  const firstLine = message.split('\n')[0].trim();
  return map[firstLine] ?? t('noe.familyInvites.joinError');
}

export function buildInviteLink(code: string): string {
  return `${JOIN_SCHEME}://join?code=${encodeURIComponent(code)}`;
}

export const familyInviteService = {
  async createInvite(familyId: string, expiresMinutes: number = INVITE_EXPIRES_MINUTES): Promise<FamilyInvite> {
    const client = requireSupabaseClient();

    const { data, error } = await client.rpc('create_family_invite', {
      p_family_id: familyId,
      p_expires_minutes: expiresMinutes,
    });

    if (error) throw new DatabaseError(inviteError(error.message));
    const row = (data as unknown as Record<string, unknown>[] | null)?.[0];
    if (!row?.code) throw new DatabaseError(t('noe.familyInvites.joinError'));

    return {
      code: String(row.code),
      expiresAt: String(row.expires_at),
    };
  },

  async redeemInvite(code: string): Promise<{ familyName: string }> {
    const client = requireSupabaseClient();
    const trimmed = code.trim();

    if (trimmed.length === 0) {
      throw new ValidationError(t('noe.familyInvites.invalidCode'));
    }

    const { data, error } = await client.rpc('redeem_family_invite', { p_code: trimmed });

    if (error) throw new DatabaseError(inviteError(error.message));
    const row = (data as unknown as Record<string, unknown>[] | null)?.[0];

    return { familyName: String(row?.family_name ?? '') };
  },
};