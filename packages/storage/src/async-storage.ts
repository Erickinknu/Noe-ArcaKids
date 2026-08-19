import AsyncStorage from '@react-native-async-storage/async-storage';

import { buildKey, StorageError, type Storage } from './storage';

export class AsyncStorageStorage implements Storage {
  async save(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(buildKey(key), value);
    } catch (cause) {
      throw new StorageError('save', key, cause);
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(buildKey(key));
    } catch (cause) {
      throw new StorageError('get', key, cause);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(buildKey(key));
    } catch (cause) {
      throw new StorageError('remove', key, cause);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (cause) {
      throw new StorageError('clear', undefined, cause);
    }
  }
}

export const storage: Storage = new AsyncStorageStorage();