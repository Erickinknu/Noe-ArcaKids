import NetInfo from '@react-native-community/netinfo';

import { logger } from '@noe-arcakids/shared';
import { useConnectionStore } from '@/stores/connection-store';

let unsubscribe: (() => void) | null = null;

export const networkService = {
  start(): void {
    if (unsubscribe) {
      return;
    }
    unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true;
      const isInternetReachable = state.isInternetReachable ?? isOnline;
      logger.debug('Network status changed', { isOnline, isInternetReachable, type: state.type });
      useConnectionStore.setState({ isOnline, isInternetReachable, initialized: true });
    });
  },
  stop(): void {
    unsubscribe?.();
    unsubscribe = null;
  },
  isOnline(): boolean {
    return useConnectionStore.getState().isOnline;
  },
};