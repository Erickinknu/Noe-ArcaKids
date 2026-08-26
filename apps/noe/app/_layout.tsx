import { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { networkService } from '@/services/network-service';
import { useAuthStore } from '@/stores/auth-store';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_DURATION = 5000;
const BAR_WIDTH = 180;
const BAR_HEIGHT = 4;

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const [ready, setReady] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate progress bar from 0 to 1 over SPLASH_DURATION
    Animated.timing(progress, {
      toValue: 1,
      duration: SPLASH_DURATION,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  useEffect(() => {
    let mounted = true;
    networkService.start();
    initialize().catch(() => {});
    const timeoutId = setTimeout(() => {
      if (mounted) setReady(true);
    }, SPLASH_DURATION);
    initI18n()
      .catch(() => {})
      .finally(() => {
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
    const barWidth = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, BAR_WIDTH],
    });

    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>NOE</Text>
        <Text style={styles.subtitle}>Parental Control</Text>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
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
    gap: 12,
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
    marginBottom: 20,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: '#C8DEF5',
    overflow: 'hidden',
  },
  barFill: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: '#208AEF',
  },
});
