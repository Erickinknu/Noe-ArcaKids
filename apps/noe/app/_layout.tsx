import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeProvider, useTheme, networkService, ErrorBoundary } from '@noe-arcakids/shared';

SplashScreen.preventAutoHideAsync().catch(() => {});

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primaryLight,
      }}
    >
      <Text style={{ fontSize: 34, fontWeight: 'bold', color: colors.primary, letterSpacing: 2 }}>
        NOE
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 8 }}>
        Parental Control
      </Text>
      <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
    </View>
  );
}

function RootNavigator() {
  const { resolved } = useTheme();

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
    return <LoadingScreen />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
