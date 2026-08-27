import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { networkService } from '@/services/network-service';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    console.log('[RootLayout] Starting init...');

    networkService.start();

    // Always become ready after 3 seconds no matter what
    const timeoutId = setTimeout(() => {
      console.log('[RootLayout] Timeout fired, setting ready');
      if (mounted) setReady(true);
    }, 3000);

    // Try init, but don't block on it
    Promise.all([
      initI18n().catch((e) => console.warn('[RootLayout] i18n error:', e?.message)),
      initialize().catch((e) => console.warn('[RootLayout] auth error:', e?.message)),
    ]).finally(() => {
      console.log('[RootLayout] Init complete, setting ready');
      clearTimeout(timeoutId);
      if (mounted) setReady(true);
    });

    return () => {
      mounted = false;
      networkService.stop();
      clearTimeout(timeoutId);
    };
  }, [initialize]);

  useEffect(() => {
    if (ready) {
      console.log('[RootLayout] Hiding splash, auth status:', useAuthStore.getState().status);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>NOE</Text>
        <Text style={styles.subtitle}>Parental Control</Text>
        <ActivityIndicator size="large" color="#208AEF" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
  },
  brand: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#208AEF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#5A6B7D',
    marginTop: 8,
  },
});
