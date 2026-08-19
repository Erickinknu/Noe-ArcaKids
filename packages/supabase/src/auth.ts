import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { AuthError, NetworkError } from '@noe-arcakids/shared';

import { requireSupabaseClient } from './client';

function mapAuthError(error: { message: string; status?: number }): AuthError | NetworkError {
  if (error.status === 0) {
    return new NetworkError('Connection failed. Check your internet connection.', {
      code: 'network',
      cause: error,
    });
  }
  return new AuthError(error.message, { code: error.status?.toString(), cause: error });
}

export const authHelpers = {
  async signInWithPassword(email: string, password: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      throw mapAuthError(error);
    }
  },

  async signUp(email: string, password: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      throw mapAuthError(error);
    }
  },

  async signOut(): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.signOut();
    if (error) {
      throw mapAuthError(error);
    }
  },

  async resetPasswordForEmail(email: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) {
      throw mapAuthError(error);
    }
  },

  async getSession() {
    const client = requireSupabaseClient();
    return client.auth.getSession();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    const client = requireSupabaseClient();
    return client.auth.onAuthStateChange(callback);
  },
};