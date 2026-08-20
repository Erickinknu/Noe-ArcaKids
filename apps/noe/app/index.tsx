import { Redirect } from 'expo-router';

import { ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/auth-store';

export default function IndexScreen() {
  const status = useAuthStore((state) => state.status);

  if (status === 'initializing') {
    return null;
  }

  return <Redirect href={status === 'authenticated' ? ROUTES.app : ROUTES.login} />;
}