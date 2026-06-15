export type CacheDriver = "memory";

export type CacheEntry<T> = T | Promise<T>;

export interface CacheStore<T> {
  get(key: string): CacheEntry<T> | undefined;
  set(key: string, value: CacheEntry<T>): void;
  has(key: string): boolean;
  isPending(key: string): boolean;
}

class MemoryCache<T> implements CacheStore<T> {
  private store = new Map<string, CacheEntry<T>>();

  get(key: string): CacheEntry<T> | undefined {
    return this.store.get(key);
  }

  set(key: string, value: CacheEntry<T>): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  isPending(key: string): boolean {
    const entry = this.store.get(key);
    return entry instanceof Promise;
  }
}

export function createCache<T>(driver: CacheDriver): CacheStore<T> {
  if (driver !== "memory") {
    throw new Error(`Unsupported cache driver: ${driver}`);
  }
  return new MemoryCache<T>();
}
