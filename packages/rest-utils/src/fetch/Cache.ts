export type CacheDriver = "memory";

export type CacheEntry<T> = T | Promise<T>;

export interface CacheOptions {
  maxEntries?: number;
  ttlMs?: number;
}

export interface CacheStore<T> {
  get(key: string): CacheEntry<T> | undefined;
  set(key: string, value: CacheEntry<T>): void;
  has(key: string): boolean;
  isPending(key: string): boolean;
  delete(key: string): void;
  clear(): void;
}

class MemoryCache<T> implements CacheStore<T> {
  private store = new Map<string, CacheEntry<T>>();
  private timestamps?: Map<string, number>;
  private maxEntries?: number;
  private ttlMs?: number;

  constructor(options?: CacheOptions) {
    this.maxEntries = options?.maxEntries;
    this.ttlMs = options?.ttlMs;
    if (this.ttlMs !== undefined && this.ttlMs > 0) {
      this.timestamps = new Map<string, number>();
    }
  }

  get(key: string): CacheEntry<T> | undefined {
    if (this.ttlMs !== undefined && this.timestamps) {
      const ts = this.timestamps.get(key);
      if (ts !== undefined && performance.now() - ts > this.ttlMs) {
        this.delete(key);
        return undefined;
      }
    }
    return this.store.get(key);
  }

  set(key: string, value: CacheEntry<T>): void {
    if (
      this.maxEntries !== undefined &&
      this.maxEntries > 0 &&
      this.store.size >= this.maxEntries &&
      !this.store.has(key)
    ) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.delete(oldest);
      }
    }
    this.store.set(key, value);
    if (this.timestamps) {
      this.timestamps.set(key, performance.now());
    }
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  isPending(key: string): boolean {
    const entry = this.get(key);
    return entry instanceof Promise;
  }

  delete(key: string): void {
    this.store.delete(key);
    this.timestamps?.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.timestamps?.clear();
  }
}

export function createCache<T>(
  driver: CacheDriver,
  options?: CacheOptions,
): CacheStore<T> {
  if (driver !== "memory") {
    throw new Error(`Unsupported cache driver: ${driver}`);
  }
  return new MemoryCache<T>(options);
}
