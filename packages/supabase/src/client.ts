import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@noe-arcakids/config';
import { UnknownError, logger } from '@noe-arcakids/shared';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!env.isSupabaseConfigured) {
    logger.warn(
      'Supabase is not configured (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY).'
    );
    return null;
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export function requireSupabaseClient(): SupabaseClient {
  const current = getSupabaseClient();
  if (!current) {
    throw new UnknownError('Supabase is not configured.');
  }
  return current;
}