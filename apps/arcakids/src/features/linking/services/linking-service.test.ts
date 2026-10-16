import { identityRepository } from '@/features/identity/repositories/identity-repository';
import { identityService } from '@/features/identity/services/identity-service';
import { linkingRepository } from '@/features/linking/repositories/linking-repository';

import { linkingService } from './linking-service';

// El limitador de tasa de `shared` es un Map global de módulo; en una suite con
// varios redeem() la segunda llamada se bloquearía. Se conserva el resto del
// módulo (t, ValidationError, SECURITY_CONFIG) y solo se neutraliza el limitador.
jest.mock('@noe-arcakids/shared', () => {
  const actual = jest.requireActual('@noe-arcakids/shared');
  return { ...actual, checkRateLimit: jest.fn() };
});

jest.mock('@/features/identity/repositories/identity-repository', () => ({
  identityRepository: { getLocalDevice: jest.fn() },
}));

jest.mock('@/features/identity/services/identity-service', () => ({
  identityService: { registerDeviceAuth: jest.fn(), saveChildLink: jest.fn() },
}));

jest.mock('@/features/linking/repositories/linking-repository', () => ({
  linkingRepository: { redeem: jest.fn() },
}));

const mockRepo = identityRepository as jest.Mocked<typeof identityRepository>;
const mockIdentity = identityService as jest.Mocked<typeof identityService>;
const mockLinking = linkingRepository as jest.Mocked<typeof linkingRepository>;

describe('linkingService.redeem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo.getLocalDevice.mockResolvedValue({
      deviceUuid: '11111111-1111-1111-1111-111111111111',
      name: 'ARCA KIDS device',
      platform: 'android',
    });
  });

  it('registra la credencial del dispositivo y guarda el vínculo tras emparejar', async () => {
    mockLinking.redeem.mockResolvedValue({
      childId: 'child-1',
      displayName: 'Ana',
      avatarUrl: null,
      familyId: 'family-1',
      deviceAuth: { email: 'arca-x@device-arcakids.invalid', password: 'secret' },
    });

    await linkingService.redeem('ABCDEFGH');

    expect(mockIdentity.registerDeviceAuth).toHaveBeenCalledWith({
      email: 'arca-x@device-arcakids.invalid',
      password: 'secret',
    });
    expect(mockIdentity.saveChildLink).toHaveBeenCalledWith({
      childId: 'child-1',
      familyId: 'family-1',
      displayName: 'Ana',
      avatar: undefined,
    });
  });

  it('no intenta autenticar si la respuesta no trae credencial', async () => {
    mockLinking.redeem.mockResolvedValue({
      childId: 'child-1',
      displayName: 'Ana',
      avatarUrl: null,
      familyId: 'family-1',
      deviceAuth: null,
    });

    await linkingService.redeem('ABCDEFGH');

    expect(mockIdentity.registerDeviceAuth).not.toHaveBeenCalled();
    expect(mockIdentity.saveChildLink).toHaveBeenCalled();
  });

  it('rechaza un código inválido antes de llamar al repositorio', async () => {
    await expect(linkingService.redeem('!!')).rejects.toThrow();
    expect(mockLinking.redeem).not.toHaveBeenCalled();
  });
});
