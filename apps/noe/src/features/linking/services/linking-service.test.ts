import { linkingRepository } from '../repositories/linking-repository';

import { linkingService } from './linking-service';

jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('../repositories/linking-repository', () => ({
  linkingRepository: {
    createPairingCode: jest.fn(),
  },
}));

const mockCreatePairingCode = jest.mocked(linkingRepository.createPairingCode);

describe('linkingService.createProvisioningPayload', () => {
  beforeEach(() => {
    mockCreatePairingCode.mockReset();
  });

  it('binds the generated code and QR payload to the given child', async () => {
    const expiresAt = '2026-01-01T00:00:00.000Z';
    mockCreatePairingCode.mockResolvedValue({ code: 'ABCDEF', expiresAt });

    const result = await linkingService.createProvisioningPayload({
      familyId: 'family-1',
      childId: 'child-1',
    });

    expect(mockCreatePairingCode).toHaveBeenCalledWith('family-1', 'child-1');
    expect(result.code).toEqual({ code: 'ABCDEF', expiresAt });
    expect(result.payload.familyId).toBe('family-1');
    expect(result.payload.childId).toBe('child-1');
    expect(result.payload.code).toBe('ABCDEF');
    expect(result.payload.androidAdminComponent).toBe('com.arcakids.child/.DeviceAdminReceiver');
  });

  it('forwards an optional device policy snapshot into the QR payload', async () => {
    mockCreatePairingCode.mockResolvedValue({
      code: 'GHJKLM',
      expiresAt: '2026-01-01T00:00:00.000Z',
    });

    const result = await linkingService.createProvisioningPayload({
      familyId: 'family-2',
      childId: 'child-2',
      devicePolicy: { dailyLimitMinutes: 60 },
    });

    expect(result.payload.devicePolicy).toEqual({ dailyLimitMinutes: 60 });
  });
});
