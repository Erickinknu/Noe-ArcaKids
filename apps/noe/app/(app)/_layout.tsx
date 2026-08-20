import { Stack, Redirect } from 'expo-router';

import { ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/auth-store';

export default function AppLayout() {
  const status = useAuthStore((state) => state.status);

  if (status !== 'authenticated') {
    return <Redirect href={ROUTES.login} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}