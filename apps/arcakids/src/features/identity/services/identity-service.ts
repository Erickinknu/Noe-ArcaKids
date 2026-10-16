import { ValidationError, t } from '@noe-arcakids/shared';
import { authHelpers } from '@noe-arcakids/supabase';
import type { FamilyMode } from '@noe-arcakids/types';

import {
  identityRepository,
  type ChildInfo,
  type DeviceCredentials,
  type LocalDevice,
} from '../repositories/identity-repository';

const MAX_NAME_LENGTH = 60;
const DEFAULT_AVATAR = '🦊';

export const identityService = {
  getLocalDevice(): Promise<LocalDevice> {
    return identityRepository.getLocalDevice();
  },

  getChildInfo(): Promise<ChildInfo | null> {
    return identityRepository.getChildInfo();
  },

  getFamilyMode(): Promise<FamilyMode> {
    return identityRepository.getFamilyMode();
  },

  isLinked(info: ChildInfo | null): info is ChildInfo & { childId: string; familyId: string } {
    return Boolean(info && info.childId && info.familyId);
  },

  async saveChildProfile(input: { name: string; avatar?: string }): Promise<void> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new ValidationError(t('validation.childNameRequired'));
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new ValidationError(
        t('validation.childNameMax', { max: MAX_NAME_LENGTH })
      );
    }
    const avatar = input.avatar?.trim() || DEFAULT_AVATAR;
    const current = await identityRepository.getChildInfo();
    await identityRepository.saveChildInfo({ ...(current ?? {}), name, avatar });
  },

  async saveChildLink(input: {
    childId: string;
    familyId: string;
    displayName: string;
    avatar?: string;
  }): Promise<void> {
    const current = await identityRepository.getChildInfo();
    await identityRepository.saveChildInfo({
      name: current?.name ?? input.displayName,
      avatar: input.avatar || current?.avatar || DEFAULT_AVATAR,
      childId: input.childId,
      familyId: input.familyId,
      linkedAt: new Date().toISOString(),
    });
  },

  /**
   * Persist the per-device Supabase credential returned by pairing and sign in
   * with it, so the device holds a real GoTrue session. Without this the child
   * app is anon and every device RPC guarded by assert_device_claim (command
   * polling, status/location reporting) is rejected — the parent's commands
   * never reach the device.
   */
  async registerDeviceAuth(credentials: DeviceCredentials): Promise<void> {
    await identityRepository.saveDeviceCredentials(credentials);
    try {
      await authHelpers.signInWithPassword(credentials.email, credentials.password);
    } catch {
      // Non-fatal: ensureDeviceSession() retries on the next launch / sync.
    }
  },

  /**
   * Guarantee the device is authenticated before issuing device RPCs. Reuses the
   * existing session when present; otherwise re-signs in from the stored device
   * credential. Returns false when the device is not paired (no credential yet).
   */
  async ensureDeviceSession(): Promise<boolean> {
    try {
      const { data } = await authHelpers.getSession();
      if (data.session?.user) return true;
    } catch {
      // Supabase not configured / session read failed: fall through to re-login.
    }
    const credentials = await identityRepository.getDeviceCredentials();
    if (!credentials) return false;
    try {
      await authHelpers.signInWithPassword(credentials.email, credentials.password);
      return true;
    } catch {
      return false;
    }
  },
};