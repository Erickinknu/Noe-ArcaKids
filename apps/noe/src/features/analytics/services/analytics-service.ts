import { Platform } from 'react-native';

import { APP_VERSION } from '@noe-arcakids/config';
import { logger } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { storage } from '@noe-arcakids/storage';

import { ANALYTICS_OPT_IN_KEY } from '@/constants';

/**
 * Eventos de producto (spec §11). Nombres cerrados para evitar fugas de datos:
 * nunca se envía texto libre, correo ni nombre de niño/a.
 */
export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'signup_completed'
  | 'login_success'
  | 'invite_redeemed'
  | 'plan_selected'
  | 'child_added'
  | 'device_linked'
  | 'pin_created'
  | 'setup_completed'
  | 'account_deleted';

// Consentimiento por defecto activo; el usuario puede desactivarlo en Seguridad.
let cachedOptIn: boolean | null = null;

async function isOptedIn(): Promise<boolean> {
  if (cachedOptIn !== null) return cachedOptIn;
  try {
    const raw = await storage.get(ANALYTICS_OPT_IN_KEY);
    cachedOptIn = raw === null ? true : raw === 'true';
  } catch {
    cachedOptIn = true;
  }
  return cachedOptIn;
}

async function send(event: string, props?: Record<string, unknown>): Promise<void> {
  try {
    if (!(await isOptedIn())) return;
    const client = requireSupabaseClient();
    const {
      data: { session },
    } = await client.auth.getSession();
    const { error } = await client.from('analytics_events').insert({
      user_id: session?.user?.id ?? null,
      event,
      props: props ?? {},
      platform: Platform.OS,
      app_version: APP_VERSION,
    });
    if (error) {
      logger.debug(`analytics insert failed: ${error.message}`);
    }
  } catch (cause) {
    logger.debug(`analytics.track failed: ${String(cause)}`);
  }
}

export const analyticsService = {
  async isEnabled(): Promise<boolean> {
    return isOptedIn();
  },

  async setEnabled(enabled: boolean): Promise<void> {
    cachedOptIn = enabled;
    await storage.save(ANALYTICS_OPT_IN_KEY, enabled ? 'true' : 'false');
  },

  /** Envía un evento best-effort (no bloquea ni lanza). */
  track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
    void send(event, props);
  },
};
