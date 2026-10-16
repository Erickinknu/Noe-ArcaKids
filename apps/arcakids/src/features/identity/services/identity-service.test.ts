import { authHelpers } from '@noe-arcakids/supabase';

import { identityRepository } from '../repositories/identity-repository';
import { identityService } from './identity-service';

jest.mock('@noe-arcakids/supabase', () => ({
  authHelpers: { getSession: jest.fn(), signInWithPassword: jest.fn() },
}));

jest.mock('../repositories/identity-repository', () => ({
  identityRepository: {
    getDeviceCredentials: jest.fn(),
    saveDeviceCredentials: jest.fn(),
    clearDeviceCredentials: jest.fn(),
  },
}));

const mockAuth = authHelpers as jest.Mocked<typeof authHelpers>;
const mockRepo = identityRepository as unknown as {
  getDeviceCredentials: jest.Mock;
  saveDeviceCredentials: jest.Mock;
};

const CREDS = { email: 'arca-x@device-arcakids.invalid', password: 'secret' };

describe('identityService.ensureDeviceSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reutiliza la sesión existente sin volver a iniciar sesión', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } } as never);

    expect(await identityService.ensureDeviceSession()).toBe(true);
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('inicia sesión con la credencial guardada cuando no hay sesión', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } } as never);
    mockRepo.getDeviceCredentials.mockResolvedValue(CREDS);

    expect(await identityService.ensureDeviceSession()).toBe(true);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith(CREDS.email, CREDS.password);
  });

  it('devuelve false cuando el dispositivo aún no está emparejado', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } } as never);
    mockRepo.getDeviceCredentials.mockResolvedValue(null);

    expect(await identityService.ensureDeviceSession()).toBe(false);
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('devuelve false si el inicio de sesión falla', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } } as never);
    mockRepo.getDeviceCredentials.mockResolvedValue(CREDS);
    mockAuth.signInWithPassword.mockRejectedValue(new Error('bad credentials'));

    expect(await identityService.ensureDeviceSession()).toBe(false);
  });
});

describe('identityService.registerDeviceAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persiste la credencial e inicia sesión', async () => {
    await identityService.registerDeviceAuth(CREDS);

    expect(mockRepo.saveDeviceCredentials).toHaveBeenCalledWith(CREDS);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith(CREDS.email, CREDS.password);
  });

  it('no lanza si el inicio de sesión falla (se reintenta en el próximo arranque)', async () => {
    mockAuth.signInWithPassword.mockRejectedValue(new Error('offline'));

    await expect(identityService.registerDeviceAuth(CREDS)).resolves.toBeUndefined();
    expect(mockRepo.saveDeviceCredentials).toHaveBeenCalledWith(CREDS);
  });
});
