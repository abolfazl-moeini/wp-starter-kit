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
  requireCacheKey?: boolean;
  maxEntries?: number;
  ttlMs?: number;
};

type BatchApiResponse<TResponse> = {
  responses?: Array<{
    status?: number;
    headers?: Record<string, string>;
    body?:
      | {
          data?: TResponse;
          extra?: { cacheKey?: string };
        }
      | TResponse;
  }>;
};

export type BatchRequestHandler<TRequest, TResponse> = {
  (params: TRequest): Promise<BatchResult<TResponse>>;
  clearCache: () => void;
  cache: CacheStore<BatchResult<TResponse>>;
};

function chunk<T>(items: T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size));
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += step) {
    out.push(items.slice(i, i + step));
  }
  return out;
}

export function createBatchRequest<
  TRequest extends Record<string, unknown>,
  TResponse,
>(
  config: BatchRequestConfig<TRequest>,
): BatchRequestHandler<TRequest, TResponse> {
  if (!Number.isInteger(config.requestChunk) || config.requestChunk < 1) {
    throw new RangeError(
      `requestChunk must be an integer >= 1, received ${config.requestChunk}`,
    );
  }

  const cache: CacheStore<BatchResult<TResponse>> = createCache(
    config.cacheDriver,
    {
      maxEntries: config.maxEntries,
      ttlMs: config.ttlMs,
    },
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
        method: "POST",
        data: {
          requests: requests.map((body) => ({
            method: config.method,
            path: config.path,
            body,
          })),
        },
      });

      const responses = result.responses ?? [];
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        const key = String(request[config.uniqueKey]);
        const responseItem = responses[i];

        if (
          responseItem &&
          typeof responseItem.status === "number" &&
          responseItem.status >= 400
        ) {
          fail(
            key,
            new Error(
              `Batch request failed with status ${responseItem.status}`,
            ),
          );
          continue;
        }

        const rawBody = responseItem?.body;
        const envelope =
          rawBody && typeof rawBody === "object" && "extra" in rawBody
            ? (rawBody as { data?: TResponse; extra?: { cacheKey?: string } })
            : undefined;

        const cacheKey =
          envelope?.extra?.cacheKey ??
          (config.requireCacheKey === false ? key : undefined);

        if (!cacheKey) {
          fail(key, new Error(`Missing extra.cacheKey for batch key "${key}"`));
          continue;
        }

        const responseData = envelope
          ? (envelope.data ?? ({} as TResponse))
          : (rawBody as TResponse);

        settle(key, {
          response: responseData,
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

  const handler = ((params: TRequest): Promise<BatchResult<TResponse>> => {
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
  }) as BatchRequestHandler<TRequest, TResponse>;

  handler.clearCache = (): void => {
    cache.clear();
  };

  handler.cache = cache;

  return handler;
}
