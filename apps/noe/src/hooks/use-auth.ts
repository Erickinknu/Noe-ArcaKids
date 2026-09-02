import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { authHelpers } from '@noe-arcakids/supabase';

export function useAuth() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const isAuthenticated = status === 'authenticated';

  const logout = async () => {
    try {
      await authHelpers.signOut();
      useAuthStore.setState({
        session: null,
        user: null,
        status: 'unauthenticated',
      });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getUser = async () => {
    return authHelpers.getUser();
  };

  const getFamilyId = async (): Promise<string | undefined> => {
    const authUser = await getUser();
    return authUser?.user_metadata?.family_id;
  };

  return {
    status,
    user,
    session,
    isAuthenticated,
    logout,
    getUser,
    getFamilyId,
  };
}
