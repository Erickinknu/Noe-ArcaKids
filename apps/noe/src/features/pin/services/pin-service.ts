import * as Crypto from 'expo-crypto';
import { storage } from '@noe-arcakids/storage';

const STORAGE_KEY = 'pin_config';
const LOCK_ON_OPEN_KEY = 'pin_lock_on_open';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

export interface PinConfig {
  /** Per-PIN random salt (hex), prevents cross-PIN/rainbow attacks. */
  salt: string;
  /** SHA-256 digest over "<salt>:<pin>". */
  pinHash: string;
  enabled: boolean;
  failedAttempts: number;
  lockedUntil?: number;
}

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Constant-time string comparison to avoid timing side-channels.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPin(salt: string, pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return digest;
}

async function generateSalt(): Promise<string> {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return toHex(bytes);
}

export const pinService = {
  async getConfig(): Promise<PinConfig | null> {
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as PinConfig;
      // Migrate/ignore legacy configs created before per-PIN salts existed.
      if (!parsed.salt || !parsed.pinHash) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async createPin(pin: string): Promise<void> {
    const salt = await generateSalt();
    const pinHash = await hashPin(salt, pin);
    const config: PinConfig = {
      salt,
      pinHash,
      enabled: true,
      failedAttempts: 0,
    };
    await storage.save(STORAGE_KEY, JSON.stringify(config));
  },

  async verifyPin(pin: string): Promise<boolean> {
    const config = await this.getConfig();
    if (!config || !config.enabled) return false;

    if (config.lockedUntil && Date.now() < config.lockedUntil) {
      return false;
    }

    const expected = await hashPin(config.salt, pin);
    const matches = timingSafeEqual(expected, config.pinHash);

    const next = { ...config };
    if (matches) {
      next.failedAttempts = 0;
      next.lockedUntil = undefined;
    } else {
      next.failedAttempts = (config.failedAttempts ?? 0) + 1;
      if (next.failedAttempts >= MAX_ATTEMPTS) {
        next.lockedUntil = Date.now() + LOCKOUT_MS;
        next.failedAttempts = 0;
      }
    }
    await storage.save(STORAGE_KEY, JSON.stringify(next));

    return matches;
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

  async isLockOnOpenEnabled(): Promise<boolean> {
    const raw = await storage.get(LOCK_ON_OPEN_KEY);
    return raw === 'true';
  },

  async setLockOnOpenEnabled(enabled: boolean): Promise<void> {
    await storage.save(LOCK_ON_OPEN_KEY, enabled ? 'true' : 'false');
  },
};
