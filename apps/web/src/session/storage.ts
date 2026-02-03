export type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStore = new Map<string, string>();

const memoryStorage: StorageLike = {
  getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) ?? null : null),
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
};

export const createSafeStorage = (): StorageLike => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return memoryStorage;
    }

    const testKey = '__seekermigrate_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);

    return window.localStorage;
  } catch (error) {
    return memoryStorage;
  }
};
