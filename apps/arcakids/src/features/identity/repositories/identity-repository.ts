import * as Crypto from 'expo-crypto';
import { storage } from '@noe-arcakids/storage';

const CHILD_INFO_KEY = 'arcakids/child-info';
const DEVICE_UUID_KEY = 'arcakids/device-uuid';
const DEVICE_NAME = 'ARCA KIDS device';

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
};