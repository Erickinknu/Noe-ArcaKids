import { Redirect } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';
import { ROUTES } from '@/constants';
import { LoadingState } from '@/components/ui/loading-state';

export default function IndexScreen() {
  const status = useAuthStore((state) => state.status);

  if (status === 'authenticated') {
    return <Redirect href={ROUTES.app} />;
  }
  if (status === 'unauthenticated') {
    return <Redirect href={ROUTES.login} />;
  }
  return <LoadingState text="" />;
}
