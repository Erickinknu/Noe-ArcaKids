import { Stack, Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/auth-store';

const ONBOARDING_KEY = 'noe_onboarding_seen_v1';

export default function AuthLayout() {
  const status = useAuthStore((state) => state.status);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((v) => {
      setSeen(v === 'true');
      setReady(true);
    }).catch(() => {
      setSeen(true); // no bloquear
      setReady(true);
    });
  }, []);

  if (status === 'authenticated') {
    return <Redirect href={ROUTES.app} />;
  }
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName={seen ? 'welcome' : 'onboarding'}
    >
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
