import { authHelpers } from '@noe-arcakids/supabase';

export interface SignInResult {
  email: string;
}

export const authRepository = {
  signInWithPassword(email: string, password: string) {
    return authHelpers.signInWithPassword(email, password);
  },
  signUp(email: string, password: string, displayName?: string) {
    return authHelpers.signUp(email, password, displayName);
  },
  signOut() {
    return authHelpers.signOut();
  },
  resetPasswordForEmail(email: string) {
    return authHelpers.resetPasswordForEmail(email);
  },
};