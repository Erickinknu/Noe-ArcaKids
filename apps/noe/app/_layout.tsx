import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Image, StyleSheet } from 'react-native';
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
    networkService.start();
    initialize().catch(() => {});
    const timeoutId = setTimeout(() => {
      if (mounted) setReady(true);
    }, 5000);
    Promise.all([initI18n().catch(() => {}), new Promise((r) => setTimeout(r, 300))])
      .then(() => {
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
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Image
          source={require('@/assets/images/splashscreen_logo.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#208AEF" style={styles.activityIndicator} />
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
    backgroundColor: '#208AEF',
  },
  splashLogo: {
    width: 80,
    height: 80,
    marginBottom: 20,
  },
  activityIndicator: {
    marginTop: 20,
  },
});
