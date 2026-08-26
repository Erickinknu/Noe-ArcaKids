import { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { networkService } from '@/services/network-service';
import { useDevicePoller } from '@/hooks/use-device-poller';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();
  const { isBlocked } = useDevicePoller();

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
      <StatusBar style="auto" />
      {i18nReady ? null : (
        <View
          style={{
            flex: 1,
            backgroundColor: '#208AEF',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Image
            source={require('@/assets/images/arca-kids.png')}
            style={styles.logo}
            width={150}
            height={150}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: '100%',
    height: '100%',
  },
});