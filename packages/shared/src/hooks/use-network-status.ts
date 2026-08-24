import { useConnectionStore } from '../stores/connection-store';

export function useNetworkStatus() {
  const isOnline = useConnectionStore((state) => state.isOnline);
  const isInternetReachable = useConnectionStore((state) => state.isInternetReachable);
  return { isOnline, isInternetReachable };
}
