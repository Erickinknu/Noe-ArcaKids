import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

import { logger } from '../logger';
import { useConnectionStore } from '../stores/connection-store';

let unsubscribe: (() => void) | null = null;

function handleConnectivityChange(state: NetInfoState) {
  useConnectionStore.setState({
    isOnline: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? null,
    initialized: true,
  });
}

export const networkService = {
  isOnline(): boolean {
    return useConnectionStore.getState().isOnline;
  },

  start() {
    if (unsubscribe) return;
    unsubscribe = NetInfo.addEventListener(handleConnectivityChange);
    logger.info('NetworkService started');
  },

  stop() {
    if (!unsubscribe) return;
    unsubscribe();
    unsubscribe = null;
    logger.info('NetworkService stopped');
  },
};
