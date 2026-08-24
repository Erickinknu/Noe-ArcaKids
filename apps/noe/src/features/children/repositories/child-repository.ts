import type { ChildProfile } from '@noe-arcakids/types';
import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

interface ChildRow {
  id: string;
  family_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ChildRow): ChildProfile {
  return {
    id: row.id,
    familyId: row.family_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    role: 'child',
  };
}

export const childRepository = {
  async listChildren(familyId: string): Promise<ChildProfile[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('children')
      .select('*')
      .eq('family_id', familyId);

    if (error) {
      throw new DatabaseError(error.message);
    }
    return (data ?? []).map((row) => mapRow(row as ChildRow));
  },

  async addChild(familyId: string, displayName: string, avatarUrl: string | null = null): Promise<ChildProfile> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('children')
      .insert({ family_id: familyId, display_name: displayName, avatar_url: avatarUrl })
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapRow(data as ChildRow);
  },

  async updateChild(childId: string, displayName: string, avatarUrl: string | null): Promise<ChildProfile> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('children')
      .update({ display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', childId)
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapRow(data as ChildRow);
  },

  async removeChild(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('children')
      .delete()
      .eq('id', childId);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};