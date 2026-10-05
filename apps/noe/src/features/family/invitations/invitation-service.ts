import { supabase } from '@/src/lib/supabase';
import type { Database } from '@/src/types/database';

export type Invitation = Database['public']['Tables']['family_invitations']['Row'];

export async function generateInvitation(familyId: string, expiresInHours = 24, maxUses = 1) {
  const { data, error } = await supabase.rpc('generate_family_invitation', {
    _family_id: familyId,
    _expires_in_hours: expiresInHours,
    _max_uses: maxUses,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function acceptInvitation(code: string) {
  const { data, error } = await supabase.rpc('accept_family_invitation', { _code: code });
  if (error) throw error;
  return data?.[0] || null;
}

export async function listInvitations(familyId: string) {
  const { data, error } = await supabase
    .from('family_invitations')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Invitation[];
}