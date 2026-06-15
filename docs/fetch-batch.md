# Fetch batch client

`@wpsk/fetch` reimplements the legacy batch-fetch behavior with strict
TypeScript, pending-promise caching, and config-driven endpoints.

## Usage

```ts
import { createBatchRequest } from "@wpsk/fetch";

const getItems = createBatchRequest({
  uniqueKey: "cacheKey",
  cacheDriver: "memory",
  requestChunk: 10,
  requestDelay: 80,
  method: "POST",
  path: "/wpsk/v1/items",
  batchEndpoint: "/batch/v1",
});
```

## Server contract

PHP handlers must return `extra.cacheKey` so the client can resolve waiters:

```php
return BatchResponse::wrap($payload, $cacheKey);
```

Enable batching with `AllowBatch` on REST handlers.

## Improvements over legacy reference

- Pending promises are cached before the network call (no hung waiters).
- `isPending()` branch returns the shared promise.
- Throws `Error` objects, not strings.
- `batchEndpoint` and `path` come from `project.config.json`.

## Coexistence

Keep `@wpsk/rest-utils` for normal single requests. Use `@wpsk/fetch` only for
high-churn debounced lookups.
