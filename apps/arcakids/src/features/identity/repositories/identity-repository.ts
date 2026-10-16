import * as Crypto from 'expo-crypto';
import type { FamilyMode } from '@noe-arcakids/types';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { storage } from '@noe-arcakids/storage';

const CHILD_INFO_KEY = 'arcakids/child-info';
const DEVICE_UUID_KEY = 'arcakids/device-uuid';
const DEVICE_CREDENTIALS_KEY = 'arcakids/device-credentials';
const DEVICE_NAME = 'ARCA KIDS device';

export interface DeviceCredentials {
  email: string;
  password: string;
}

const FAMILY_MODES: FamilyMode[] = ['general', 'cristiano', 'educativo'];

export interface ChildInfo {
  name: string;
  avatar: string;
  childId?: string;
  familyId?: string;
  linkedAt?: string;
}

export interface LocalDevice {
  deviceUuid: string;
  name: string;
  platform: 'android' | 'ios';
}

export const identityRepository = {
  async getLocalDevice(): Promise<LocalDevice> {
    let deviceUuid = await storage.get(DEVICE_UUID_KEY);
    if (!deviceUuid) {
      deviceUuid = Crypto.randomUUID();
      await storage.save(DEVICE_UUID_KEY, deviceUuid);
    }
    return {
      deviceUuid,
      name: DEVICE_NAME,
      platform: 'android',
    };
  },

  async getDeviceCredentials(): Promise<DeviceCredentials | null> {
    const raw = await storage.get(DEVICE_CREDENTIALS_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<DeviceCredentials>;
      if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string') {
        return null;
      }
      return { email: parsed.email, password: parsed.password };
    } catch {
      return null;
    }
  },

  async saveDeviceCredentials(credentials: DeviceCredentials): Promise<void> {
    await storage.save(DEVICE_CREDENTIALS_KEY, JSON.stringify(credentials));
  },

  async clearDeviceCredentials(): Promise<void> {
    await storage.remove(DEVICE_CREDENTIALS_KEY);
  },

  async getChildInfo(): Promise<ChildInfo | null> {
    const raw = await storage.get(CHILD_INFO_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<ChildInfo>;
      if (typeof parsed.name !== 'string' || typeof parsed.avatar !== 'string') {
        return null;
      }
      return {
        name: parsed.name,
        avatar: parsed.avatar,
        childId: typeof parsed.childId === 'string' ? parsed.childId : undefined,
        familyId: typeof parsed.familyId === 'string' ? parsed.familyId : undefined,
        linkedAt: typeof parsed.linkedAt === 'string' ? parsed.linkedAt : undefined,
      };
    } catch {
      return null;
    }
  },

  async saveChildInfo(info: ChildInfo): Promise<void> {
    await storage.save(CHILD_INFO_KEY, JSON.stringify(info));
  },

  async getFamilyMode(): Promise<FamilyMode> {
    try {
      const device = await identityRepository.getLocalDevice();
      const client = requireSupabaseClient();
      const { data, error } = await client.rpc('get_family_mode', {
        p_device_uuid: device.deviceUuid,
      });
      if (error) return 'general';
      return FAMILY_MODES.includes(data as FamilyMode) ? (data as FamilyMode) : 'general';
    } catch {
      return 'general';
    }
  },
};