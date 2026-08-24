import { create } from 'zustand';

export interface ConnectionState {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  initialized: boolean;
}

export const useConnectionStore = create<ConnectionState>(() => ({
  isOnline: false,
  isInternetReachable: null,
  initialized: false,
}));
