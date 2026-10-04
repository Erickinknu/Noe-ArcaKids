import type { authHelpers as AuthHelpers } from '@noe-arcakids/supabase';
import type { useAuthStore as UseAuthStore } from '@/stores/auth-store';

jest.mock('@noe-arcakids/shared', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

jest.mock('@noe-arcakids/supabase', () => ({
  authHelpers: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  },
}));

type AuthStore = typeof UseAuthStore;
type AuthHelpersType = typeof AuthHelpers;

describe('auth-store: una red lenta no es una ausencia de sesion', () => {
  let useAuthStore: AuthStore;
  let authHelpers: AuthHelpersType;
  let getSession: jest.Mock;
  let onAuthStateChange: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    authHelpers = require('@noe-arcakids/supabase').authHelpers;
    useAuthStore = require('@/stores/auth-store').useAuthStore;
    getSession = authHelpers.getSession as unknown as jest.Mock;
    onAuthStateChange = authHelpers.onAuthStateChange as unknown as jest.Mock;
  });

  function setNetworkFailure() {
    getSession.mockRejectedValue(new Error('fetch failed'));
  }

  function setSignedIn() {
    getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.c', created_at: '2024-01-01' } } },
      error: null,
    });
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  }

  it('no marca la sesion como no autenticada cuando Supabase falla por red', async () => {
    setNetworkFailure();

    await useAuthStore.getState().initialize();

    const state = useAuthStore.getState();
    expect(state.status).toBe('initializing');
    expect(state.status).not.toBe('unauthenticated');
    expect(state.initializationError).toBeInstanceOf(Error);
  });

  it('deja el usuario intacto si ya habia sesion y la red falla despues', async () => {
    setNetworkFailure();
    useAuthStore.setState({
      status: 'authenticated',
      initialized: true,
      session: { user: { id: 'u1' } } as never,
      user: { id: 'u1', email: 'a@b.c', createdAt: '2024-01-01' },
      initializationError: null,
    });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });

  it('si la sesion existe, la app queda autenticada', async () => {
    setSignedIn();

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().initializationError).toBeNull();
  });

  it('retryInitialization limpia el error y vuelve a intentar', async () => {
    setNetworkFailure();
    await useAuthStore.getState().initialize();
    expect(useAuthStore.getState().initializationError).toBeInstanceOf(Error);

    setSignedIn();
    useAuthStore.getState().retryInitialization();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(useAuthStore.getState().initializationError).toBeNull();
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});