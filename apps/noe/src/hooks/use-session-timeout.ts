import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SECURITY_CONFIG } from '@noe-arcakids/shared';
import { useAuth } from './use-auth';

/**
 * Automatically logs the user out after a period of inactivity.
 * Resets the timer when the app returns to foreground.
 */
export function useSessionTimeout() {
  const { logout, isAuthenticated } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isAuthenticated) {
      timerRef.current = setTimeout(() => {
        logout();
      }, SECURITY_CONFIG.sessionTimeout);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground — check if session expired
        resetTimer();
      }
      appState.current = nextState;
    });

    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      subscription?.remove();
    };
  }, [isAuthenticated]);
}
