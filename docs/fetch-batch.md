# Fetch batch client

`createBatchRequest` lives in `@wpdev/rest-utils` (merged from the deprecated
`@wpdev/fetch` shim). It reimplements the legacy batch-fetch behavior with strict
TypeScript, pending-promise caching, and config-driven endpoints.

## Usage

```ts
import { createBatchRequest } from "@wpdev/rest-utils";

const getItems = createBatchRequest({
  uniqueKey: "cacheKey",
  cacheDriver: "memory",
  requestChunk: 10,
  requestDelay: 80,
  method: "POST",
  path: "/wpdev-starter/v1/items",
  batchEndpoint: "/batch/v1",
});
```

For TypeScript subpath imports (bundlers that resolve package exports):

```ts
import { createBatchRequest } from "@wpdev/rest-utils/fetch";
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

Use `@wpdev/rest-utils` for normal single requests and for the batch client.
The standalone `@wpdev/fetch` package is a one-release deprecation shim that
re-exports the same API from `@wpdev/rest-utils/fetch`.