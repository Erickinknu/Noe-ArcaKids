import { requireSupabaseClient } from '@noe-arcakids/supabase';

import { linkingRepository } from './linking-repository';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(),
}));

const mockClient = requireSupabaseClient as jest.Mock;

const DEVICE = { deviceUuid: '11111111-1111-1111-1111-111111111111', name: 'ARCA KIDS device', platform: 'android' as const };

function withInvoke(result: { data: unknown; error: unknown }): { invoke: jest.Mock } {
  const invoke = jest.fn(async () => result);
  mockClient.mockReturnValue({ functions: { invoke } });
  return { invoke };
}

describe('linkingRepository.redeem', () => {
  it('devuelve la credencial del dispositivo cuando la edge function la incluye', async () => {
    withInvoke({
      data: {
        childId: 'child-1',
        displayName: 'Ana',
        avatarUrl: null,
        familyId: 'family-1',
        deviceAuth: { email: 'arca-x@device-arcakids.invalid', password: 'secret' },
      },
      error: null,
    });

    const result = await linkingRepository.redeem('ABCDEFGH', DEVICE);

    expect(result).toEqual({
      childId: 'child-1',
      displayName: 'Ana',
      avatarUrl: null,
      familyId: 'family-1',
      deviceAuth: { email: 'arca-x@device-arcakids.invalid', password: 'secret' },
    });
  });

  it('deviceAuth es null cuando la respuesta no lo trae o está malformado', async () => {
    withInvoke({
      data: { childId: 'child-1', displayName: 'Ana', avatarUrl: null, familyId: 'family-1', deviceAuth: { email: 42 } },
      error: null,
    });

    const result = await linkingRepository.redeem('ABCDEFGH', DEVICE);

    expect(result.deviceAuth).toBeNull();
  });

  it('lanza cuando la edge function responde con error', async () => {
    const body = { error: { message: 'Código inválido' } };
    withInvoke({
      data: null,
      error: { context: { json: async () => body, clone: () => ({ json: async () => body }) } },
    });

    await expect(linkingRepository.redeem('BADCODE1', DEVICE)).rejects.toThrow('Código inválido');
  });
});
