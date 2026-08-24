import { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { networkService } from '@/services/network-service';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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