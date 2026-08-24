import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@noe-arcakids';

function buildKey(key: string): string {
  return `${STORAGE_PREFIX}/${key}`;
}

export const storage = {
  async save(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(buildKey(key), value);
  },
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(buildKey(key));
  },
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(buildKey(key));
  },
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },
};