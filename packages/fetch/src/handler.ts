import apiFetch from "@wordpress/api-fetch";
import { createCache, type CacheStore } from "./Cache";

export type BatchResult<TResponse> = {
  response: TResponse;
  fresh: boolean;
};

export type BatchRequestConfig<TRequest> = {
  uniqueKey: keyof TRequest & string;
  cacheDriver: "memory";
  requestChunk: number;
  requestDelay: number;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  batchEndpoint: string;
};

type BatchApiResponse<TResponse> = {
  responses?: Array<{
    body?: {
      data?: TResponse;
      extra?: { cacheKey?: string };
    };
  }>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function createBatchRequest<
  TRequest extends Record<string, unknown>,
  TResponse,
>(config: BatchRequestConfig<TRequest>) {
  const cache: CacheStore<BatchResult<TResponse>> = createCache(
    config.cacheDriver,
  );
  const stack: TRequest[] = [];
  const deferred = new Map<
    string,
    {
      resolve: (value: BatchResult<TResponse>) => void;
      reject: (error: Error) => void;
    }
  >();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const settle = (key: string, value: BatchResult<TResponse>): void => {
    cache.set(key, value);
    const entry = deferred.get(key);
    if (entry) {
      entry.resolve(value);
      deferred.delete(key);
    }
  };

  const fail = (key: string, error: Error): void => {
    cache.delete(key);
    const entry = deferred.get(key);
    if (entry) {
      entry.reject(error);
      deferred.delete(key);
    }
  };

  const processChunk = async (requests: TRequest[]): Promise<void> => {
    try {
      const result = await apiFetch<BatchApiResponse<TResponse>>({
        path: config.batchEndpoint,
        method: config.method,
        data: {
          requests: requests.map((body) => ({
            path: config.path,
            body,
          })),
        },
      });

      const responses = result.responses ?? [];
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const key = String(request[config.uniqueKey]);
        const body = responses[i]?.body;
        const cacheKey = body?.extra?.cacheKey;

        if (!cacheKey) {
          fail(key, new Error(`Missing extra.cacheKey for batch key "${key}"`));
          continue;
        }

        settle(key, {
          response: (body?.data ?? {}) as TResponse,
          fresh: true,
        });
        if (cacheKey !== key) {
          cache.set(cacheKey, cache.get(key) as BatchResult<TResponse>);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      requests.forEach((request) => {
        fail(String(request[config.uniqueKey]), err);
      });
    }
  };

  const flush = (): void => {
    timer = null;
    const batch = stack.splice(0, stack.length);
    if (batch.length === 0) {
      return;
    }
    chunk(batch, config.requestChunk).forEach((requests) => {
      void processChunk(requests);
    });
  };

  const scheduleFlush = (): void => {
    if (timer !== null) {
      return;
    }
    timer = setTimeout(flush, config.requestDelay);
  };

  return (params: TRequest): Promise<BatchResult<TResponse>> => {
    const key = String(params[config.uniqueKey]);
    const cached = cache.get(key);

    if (cached !== undefined) {
      if (cached instanceof Promise) {
        return cached;
      }
      return Promise.resolve({ response: cached.response, fresh: false });
    }

    const promise = new Promise<BatchResult<TResponse>>((resolve, reject) => {
      deferred.set(key, { resolve, reject });
      stack.push(params);
      scheduleFlush();
    });

    cache.set(key, promise);
    return promise;
  };
}
