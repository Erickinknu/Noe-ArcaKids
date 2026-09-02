import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export const feedbackRepository = {
  async submit(userId: string, message: string, status = 'new'): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('feedback')
      .insert({ user_id: userId, message, status });

    if (error) throw new DatabaseError(error.message);
  },
};