import { storage } from '@noe-arcakids/storage';

const CHILD_INFO_KEY = 'arcakids/child-info';

export interface ChildInfo {
  name: string;
  avatar: string;
}

export const identityRepository = {
  async getDevice(): Promise<null> {
    return null;
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
      return { name: parsed.name, avatar: parsed.avatar };
    } catch {
      return null;
    }
  },

  async saveChildInfo(info: ChildInfo): Promise<void> {
    await storage.save(CHILD_INFO_KEY, JSON.stringify(info));
  },
};