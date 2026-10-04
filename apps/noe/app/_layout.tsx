import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { initI18n } from '@/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { pushNotificationService } from '@/features/notifications/services/push-notification-service';
import { ThemeProvider, useTheme, networkService, ErrorBoundary, sentryService } from '@noe-arcakids/shared';

SplashScreen.preventAutoHideAsync().catch(() => {});
sentryService.init();

/** Espera antes de cada reintento de autenticacion, en ms. El ultimo valor se
 *  repite para no crecer sin limite mientras la red sigue caida. */
const AUTH_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000] as const;

function LoadingScreen({ message }: { message?: string }) {
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
      {message ? (
        <Text
          style={{
            fontSize: 13,
            color: colors.textMuted,
            marginTop: 14,
            textAlign: 'center',
            paddingHorizontal: 32,
          }}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
}

function RootNavigator() {
  const { colors, resolved } = useTheme();

  const initialize = useAuthStore((state) => state.initialize);
  const retryInitialization = useAuthStore((state) => state.retryInitialization);
  const status = useAuthStore((state) => state.status);
  const initializationError = useAuthStore((state) => state.initializationError);

  // Solo se navega cuando el estado de sesion es definitivo. Mientras Supabase
  // no responda seguimos en carga: una red lenta jamas se trata como ausencia
  // de sesion.
  const ready = status === 'authenticated' || status === 'unauthenticated';
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    networkService.start();

    initI18n().catch((e) => console.warn('[RootLayout] i18n error:', e?.message));
    initialize().catch((e) => console.warn('[RootLayout] auth error:', e?.message));

    return () => {
      networkService.stop();
    };
  }, [initialize]);

  // Reintentos con backoff, solo mientras la sesion siga sin resolverse.
  useEffect(() => {
    if (ready) {
      return;
    }
    const delay = AUTH_RETRY_DELAYS_MS[Math.min(attempt, AUTH_RETRY_DELAYS_MS.length - 1)];
    const id = setTimeout(() => {
      console.log('[RootLayout] Session unresolved, retrying auth init');
      retryInitialization();
      setAttempt((n) => n + 1);
    }, delay);
    return () => clearTimeout(id);
  }, [ready, attempt, retryInitialization]);

  useEffect(() => {
    let active = true;
    let disposeNotifications: (() => void) | null = null;

    pushNotificationService.configure().then((dispose) => {
      if (!active) return;
      disposeNotifications = dispose;
    });

    const register = async () => {
      const granted = await pushNotificationService.requestPermissions();
      if (granted) {
        await pushNotificationService.registerPushToken();
      }
    };

    if (useAuthStore.getState().status === 'authenticated') {
      register();
    }

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.status === 'authenticated') {
        register();
      } else {
        pushNotificationService.unregisterPushToken();
      }
    });

    return () => {
      active = false;
      disposeNotifications?.();
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ready) {
      console.log('[RootLayout] Hiding splash, auth status:', useAuthStore.getState().status);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return (
      <LoadingScreen
        message={initializationError ? 'Sin conexión. Reintentando…' : 'Conectando…'}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider app="noe">
      <ErrorBoundary>
        <RootNavigator />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
