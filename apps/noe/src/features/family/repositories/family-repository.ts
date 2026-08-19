import type { Family, ParentProfile } from '@noe-arcakids/types';
import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface MyFamily {
  profile: ParentProfile;
  family: Family;
}

interface FamilyRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface MyFamilyRow {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  email: string | null;
  role: 'parent' | 'child';
  created_at: string;
  updated_at: string;
  families: FamilyRow | FamilyRow[] | null;
}

function toFamily(row: FamilyRow | FamilyRow[] | null): Family {
  if (!row) {
    return { id: '', name: '', createdAt: '', updatedAt: '' };
  }
  const single = Array.isArray(row) ? row[0] : row;
  if (!single) {
    return { id: '', name: '', createdAt: '', updatedAt: '' };
  }
  return {
    id: single.id,
    name: single.name,
    createdAt: single.created_at,
    updatedAt: single.updated_at,
  };
}

function mapRow(row: MyFamilyRow): MyFamily {
  const family = toFamily(row.families);
  const profile: ParentProfile = {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    familyId: family.id,
  };
  return { profile, family };
}

export const familyRepository = {
  async getMyFamily(): Promise<MyFamily> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('profiles')
      .select(
        'id, user_id, display_name, avatar_url, email, role, created_at, updated_at, families(id, name, created_at, updated_at)'
      )
      .not('user_id', 'is', null)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }
    if (!data) {
      throw new DatabaseError('Profile not found.');
    }
    return mapRow(data as unknown as MyFamilyRow);
  },

  async renameFamily(familyId: string, name: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from('families').update({ name }).eq('id', familyId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};