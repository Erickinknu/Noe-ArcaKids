import { create } from 'zustand';
import type { Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';

import type { User } from '@noe-arcakids/types';
import { authHelpers } from '@noe-arcakids/supabase';
import { logger } from '@noe-arcakids/shared';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  initialized: boolean;
  session: SupabaseSession | null;
  user: User | null;
  initialize: () => Promise<void>;
}

function toDomainUser(user: SupabaseUser | undefined): User | null {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at,
  };
}

function applySession(session: SupabaseSession | null) {
  useAuthStore.setState({
    session,
    user: toDomainUser(session?.user),
    status: session ? 'authenticated' : 'unauthenticated',
  });
}

let unsubscribeAuth: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set) => ({
  status: 'initializing',
  initialized: false,
  session: null,
  user: null,
  initialize: async () => {
    if (unsubscribeAuth) {
      return;
    }
    try {
      const { data } = await authHelpers.getSession();
      if (data.session) {
        applySession(data.session);
      }
      unsubscribeAuth = authHelpers.onAuthStateChange((_event, session) => {
        applySession(session);
      }).data.subscription.unsubscribe;
    } catch (error) {
      logger.warn('Auth initialization failed', error);
      set({ status: 'unauthenticated', session: null, user: null });
    } finally {
      set({ initialized: true });
    }
  },
}));
