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
  /**
   * Ultimo fallo al resolver la sesion. Es distinto de "no hay sesion": si esta
   * presente, la app debe esperar y reintentar, nunca redirigir al login.
   */
  initializationError: Error | null;
  initialize: () => Promise<void>;
  retryInitialization: () => void;
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
  initializationError: null,
  retryInitialization: () => {
    set({ initializationError: null });
    void useAuthStore.getState().initialize();
  },
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
      set({ initializationError: null });
    } catch (error) {
      // Una red lenta o caida NO significa "sin sesion". Dejamos el estado en
      // 'initializing' para que la app espere y reintente, en lugar de enviar
      // al usuario al login como si nunca hubiera iniciado sesion.
      logger.warn('Auth initialization failed', error);
      set({
        initializationError: error instanceof Error ? error : new Error(String(error)),
      });
    } finally {
      set({ initialized: true });
    }
  },
}));
