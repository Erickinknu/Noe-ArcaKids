import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

/**
 * Guardia del botón atrás del sistema (Android):
 * - Si la pila de navegación puede retroceder → vuelve a la pantalla anterior.
 * - Si ya está en una pantalla raíz → pide doble pulsación para salir (toast).
 * - Las rutas bloqueadas (p. ej. PIN gate, bloqueo total) consumen el evento.
 */
export function useSystemBackGuard(options?: { blockedRoutes?: string[] }) {
  const router = useRouter();
  const segments = useSegments();
  const lastPress = useRef(0);
  const blockedKey = (options?.blockedRoutes ?? []).join('|');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const blocked = blockedKey ? blockedKey.split('|') : [];
    const onBackPress = () => {
      const route = segments.join('/');
      if (blocked.some((b) => b.length > 0 && route.includes(b))) return true;
      try {
        if (router.canGoBack()) {
          router.back();
          return true;
        }
      } catch {
        /* cae a doble-tap */
      }
      const now = Date.now();
      if (now - lastPress.current < 2000) {
        lastPress.current = 0;
        BackHandler.exitApp();
        return true;
      }
      lastPress.current = now;
      ToastAndroid.show('Pulsa de nuevo para salir', ToastAndroid.SHORT);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router, segments, blockedKey]);
}
