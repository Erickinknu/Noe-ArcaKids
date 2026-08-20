import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { networkService } from '@/services/network-service';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initI18n()
      .catch(() => {})
      .finally(() => {
        if (mounted) {
          setI18nReady(true);
        }
      });
    networkService.start();
    initialize();
    return () => {
      mounted = false;
      networkService.stop();
    };
  }, [initialize]);

  useEffect(() => {
    if (initialized && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [initialized, i18nReady]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}