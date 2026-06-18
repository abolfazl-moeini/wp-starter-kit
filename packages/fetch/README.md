# @wpdev/fetch

**Deprecated.** Use [`@wpdev/rest-utils/fetch`](../rest-utils/README.md) instead.

This package is a backward-compatibility shim that re-exports the batch fetch
client from `@wpdev/rest-utils`. New code should import directly:

```ts
import { createBatchRequest } from "@wpdev/rest-utils/fetch";
```
