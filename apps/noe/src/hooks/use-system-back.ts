import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { ROUTES } from '@/constants';

/**
 * Guardia del botón atrás del sistema (Android):
 * - Atrás jerárquico (nada de historial):
 *   - Si segments.length > 2 → retrocede UN nivel hacia su tab con router.back().
 *   - Si no, si está en un tab distinto de Inicio → va al tab Inicio.
 *   - Si ya está en Inicio → pide doble pulsación para salir (toast).
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
      if (segments.length > 2) {
        try {
          router.back();
        } catch {
          /* ignora: ya se consume el evento */
        }
        return true;
      }
      if (segments[1] && (segments[1] as string) !== 'index') {
        try {
          router.navigate(ROUTES.app as any);
        } catch {
          try {
            router.replace('/' as any);
          } catch {
            /* ignora: ya se consume el evento */
          }
        }
        return true;
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
