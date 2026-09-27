import { SECURITY_CONFIG } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import { generatePairingCode, linkingRepository } from './linking-repository';

const mockRandomBytes = { value: 0 };

jest.mock('expo-crypto', () => ({
  getRandomValues: (arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i += 1) {
      mockRandomBytes.value = (mockRandomBytes.value + 7) % 256;
      arr[i] = mockRandomBytes.value;
    }
    return arr;
  },
}));

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(),
}));

// El barrel de @noe-arcakids/shared carga el tema (y por tanto AsyncStorage nativo),
// que no existe en el entorno de jest-expo.
jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = SECURITY_CONFIG.pairingCodeLength;

const mockInsert = () => {
  const insert = jest.fn().mockResolvedValue({ error: null });
  const from = jest.fn().mockReturnValue({ insert });
  jest.mocked(requireSupabaseClient).mockReturnValue({
    from,
  } as unknown as ReturnType<typeof requireSupabaseClient>);
  return insert;
};

describe('generatePairingCode', () => {
  it('generates a code with the length declared in SECURITY_CONFIG', () => {
    expect(generatePairingCode()).toHaveLength(CODE_LENGTH);
  });

  it('only uses uppercase unambiguous characters', () => {
    const pattern = new RegExp(`^[${CODE_CHARSET}]{${CODE_LENGTH}}$`);

    for (let attempt = 0; attempt < 25; attempt += 1) {
      expect(generatePairingCode()).toMatch(pattern);
    }
  });

  it('returns a different code on each call', () => {
    const codes = new Set(Array.from({ length: 25 }, () => generatePairingCode()));

    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('linkingRepository.createPairingCode', () => {
  it('stores a code that expires with the pairing expiry from SECURITY_CONFIG', async () => {
    const insert = mockInsert();
    const before = Date.now();

    const result = await linkingRepository.createPairingCode('family-id', 'child-id');

    const after = Date.now();
    expect(insert).toHaveBeenCalledTimes(1);

    const { code, expires_at: expiresAt } = insert.mock.calls[0][0];
    const expiresAtMs = new Date(expiresAt).getTime();

    expect(code).toHaveLength(CODE_LENGTH);
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + SECURITY_CONFIG.pairingCodeExpiry);
    expect(expiresAtMs).toBeLessThanOrEqual(after + SECURITY_CONFIG.pairingCodeExpiry);
    expect(result.code).toBe(code);
    expect(new Date(result.expiresAt).getTime()).toBe(expiresAtMs);
  });

  it('retries on a unique violation and returns the accepted code', async () => {
    const insert = jest
      .fn()
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } })
      .mockResolvedValueOnce({ error: null });
    const from = jest.fn().mockReturnValue({ insert });
    jest.mocked(requireSupabaseClient).mockReturnValue({
      from,
    } as unknown as ReturnType<typeof requireSupabaseClient>);

    const result = await linkingRepository.createPairingCode('family-id', 'child-id');

    expect(insert).toHaveBeenCalledTimes(2);
    expect(result.code).toHaveLength(CODE_LENGTH);
  });
});
