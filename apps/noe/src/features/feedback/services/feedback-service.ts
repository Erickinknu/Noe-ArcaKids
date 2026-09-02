import { DatabaseError, ValidationError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import { feedbackRepository } from '../repositories/feedback-repository';

export const feedbackService = {
  async submit(message: string): Promise<void> {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('El mensaje no puede estar vacío');
    }

    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new DatabaseError('No user');

    await feedbackRepository.submit(user.id, trimmed);
  },
};