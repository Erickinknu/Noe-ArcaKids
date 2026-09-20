import { familyPinService, hashPin } from './family-pin-service';
import type { FamilyPin } from '../repositories/family-pin-repository';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(() => ({ rpc: jest.fn(async () => ({ data: null, error: null })) })),
}));

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
  digestStringAsync: jest.fn(async (_algorithm: string, input: string) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('crypto').createHash('sha256').update(input, 'utf8').digest('hex')
  ),
}));

jest.mock('@/features/identity/services/identity-service', () => ({
  identityService: {
    getLocalDevice: jest.fn(async () => ({ deviceUuid: 'device-1' })),
  },
}));

const SALT = 'a1b2c3d4';
const PIN = '4815';
const PIN_HASH = '13d81f9d178a504bdafedbe6a3015b4ac45fa1e01964cbb097e354035e92b6d0';

jest.mock('@/features/family-pin/repositories/family-pin-repository', () => ({
  familyPinRepository: {
    getCachedPin: jest.fn(async () => null),
    setCachedPin: jest.fn(async () => {}),
    fetchPin: jest.fn(async () => ({ salt: SALT, pinHash: PIN_HASH } as FamilyPin)),
  },
}));

describe('hashPin', () => {
  it('produce el mismo hash que NOE: sha256("<salt>:<pin>") en hex', async () => {
    const digest = await hashPin(SALT, PIN);
    expect(digest).toBe(PIN_HASH);
  });
});

describe('familyPinService.verifyPin', () => {
  it('acepta el PIN correcto', async () => {
    expect(await familyPinService.verifyPin(PIN)).toBe(true);
  });

  it('rechaza un PIN incorrecto', async () => {
    expect(await familyPinService.verifyPin('0000')).toBe(false);
  });
});