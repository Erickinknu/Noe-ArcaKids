import { create } from 'zustand';

export interface ConnectionState {
  isOnline: boolean;
  isInternetReachable: boolean;
  initialized: boolean;
}

export const useConnectionStore = create<ConnectionState>(() => ({
  isOnline: true,
  isInternetReachable: true,
  initialized: false,
}));