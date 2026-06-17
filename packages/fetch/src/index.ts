/**
 * @deprecated Import from `@wpdev/rest-utils` or `@wpdev/rest-utils/fetch` instead.
 * This package re-exports the batch client for one release cycle.
 */
export {
  createCache,
  type CacheDriver,
  type CacheStore,
} from "../../rest-utils/src/fetch/Cache";
export {
  createBatchRequest,
  type BatchRequestConfig,
  type BatchResult,
} from "../../rest-utils/src/fetch/handler";