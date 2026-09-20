import * as Crypto from 'expo-crypto';

import { identityService } from '@/features/identity/services/identity-service';

import {
  familyPinRepository,
  type FamilyPin,
} from '../repositories/family-pin-repository';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

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

/**
 * Must mirror NOE (pin-service): SHA-256 over "<salt>:<pin>", hex encoded.
 */
export async function hashPin(salt: string, pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX }
  );
  return digest;
}

let failedAttempts = 0;
let lockedUntil = 0;

export const familyPinService = {
  async getPin(): Promise<FamilyPin | null> {
    const cached = await familyPinRepository.getCachedPin();
    if (cached) return cached;
    try {
      const device = await identityService.getLocalDevice();
      const pin = await familyPinRepository.fetchPin(device.deviceUuid);
      if (pin) await familyPinRepository.setCachedPin(pin);
      return pin;
    } catch {
      return cached;
    }
  },

  async hasPin(): Promise<boolean> {
    return (await this.getPin()) !== null;
  },

  isLocked(): boolean {
    return Date.now() < lockedUntil;
  },

  async verifyPin(pin: string): Promise<boolean> {
    const now = Date.now();
    if (now < lockedUntil) return false;

    const info = await this.getPin();
    if (!info) return false;

    const expected = await hashPin(info.salt, pin);
    const matches = timingSafeEqual(expected, info.pinHash);

    if (matches) {
      failedAttempts = 0;
      lockedUntil = 0;
    } else {
      failedAttempts += 1;
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockedUntil = now + LOCKOUT_MS;
        failedAttempts = 0;
      }
    }
    return matches;
  },
};