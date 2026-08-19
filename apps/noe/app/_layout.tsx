import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { networkService } from '@/services/network-service';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    networkService.start();
    initialize();
    return () => networkService.stop();
  }, [initialize]);

  useEffect(() => {
    if (initialized) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initialized]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}