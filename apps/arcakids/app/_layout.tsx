import { useEffect, useState } from 'react';
import { View, Image } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { useDevicePoller } from '@/hooks/use-device-poller';
import { ThemeProvider, useTheme, networkService, ErrorBoundary } from '@noe-arcakids/shared';
import { captureException, captureMessage } from '@/lib/sentry';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const [i18nReady, setI18nReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { isBlocked } = useDevicePoller();
  const { colors, resolved } = useTheme();

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
    return () => {
      mounted = false;
      networkService.stop();
    };
  }, []);

  useEffect(() => {
    if (i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [i18nReady]);

  // Redirect to blocked screen when device is blocked
  useEffect(() => {
    if (!i18nReady) return;
    const currentRoute = segments.join('/');
    if (isBlocked && currentRoute !== 'blocked') {
      router.replace('/blocked');
    } else if (!isBlocked && currentRoute === 'blocked') {
      router.replace('/');
    }
  }, [isBlocked, i18nReady, segments, router]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {i18nReady ? null : (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Image
            source={require('@/assets/images/arca-kids.png')}
            width={150}
            height={150}
            resizeMode="contain"
          />
        </View>
      )}
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