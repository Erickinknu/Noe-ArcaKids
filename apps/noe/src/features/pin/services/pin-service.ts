import { storage } from '@noe-arcakids/storage';

const STORAGE_KEY = 'pin_config';
const PIN_SALT = 'noe-arcakids-pin-v1';

export interface PinConfig {
  pinHash: string;
  enabled: boolean;
}

/**
 * Simple non-reversible hash for PIN storage.
 * Uses bit-mixing to produce a fingerprint that cannot be trivially reversed.
 * For a 4-6 digit PIN this provides sufficient local protection.
 */
function hashPin(pin: string): string {
  const input = PIN_SALT + pin;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36);
}

export const pinService = {
  async getConfig(): Promise<PinConfig | null> {
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PinConfig;
    } catch {
      return null;
    }
  },

  async createPin(pin: string): Promise<void> {
    const config: PinConfig = { pinHash: hashPin(pin), enabled: true };
    await storage.save(STORAGE_KEY, JSON.stringify(config));
  },

  async verifyPin(pin: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config) return false;
    return config.pinHash === hashPin(pin);
  },

  async updatePin(oldPin: string, newPin: string): Promise<boolean> {
    const valid = await this.verifyPin(oldPin);
    if (!valid) return false;
    await this.createPin(newPin);
    return true;
  },

  async isEnabled(): Promise<boolean> {
    const config = await this.getConfig();
    return config?.enabled ?? false;
  },
};
