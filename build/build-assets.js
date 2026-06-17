/**
 * Backwards-compatibility re-export.
 *
 * The asset-copy implementation now lives in the publishable
 * `@wpdev/build` package (`core/packages/build/build-assets.js`) so
 * generated consumer projects can run `wpdev-build-assets` from their
 * `node_modules`. The kit root keeps this re-export so existing
 * internal scripts and tests that import `build/build-assets.js`
 * continue to work.
 */
export { buildAssets } from "@wpdev/build/build-assets.js";
