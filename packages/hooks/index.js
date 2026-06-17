/**
 * @wpdev/hooks — config-driven accessor for the deps-bundle hooks instance.
 *
 * The actual `hooks` object lives on the IIFE global created by
 * `assets/dependencies.js` (see @wordpress/hooks `createHooks()`). Component
 * bundles must not bundle a second `createHooks()` — they must read from the
 * global, otherwise the dispatch/registration halves of the hook system
 * would diverge.
 *
 * `globalName` is injected by esbuild `define` at build time
 * (__WPDEV_GLOBAL_NAME__).  Fallback keeps the kit working in dev/test when
 * the define is absent.
 *
 * Both the default export (a getter function) and the named `getHooks`
 * accessor are provided for ergonomics:
 *
 *   import getHooks from '@wpdev/hooks';
 *   getHooks().doAction('wpsk-form-init', container);
 *
 *   import { getHooks } from '@wpdev/hooks';
 *   getHooks('MyApp').addAction(...);
 */

const FALLBACK_GLOBAL =
  typeof __WPDEV_GLOBAL_NAME__ !== "undefined" ? __WPDEV_GLOBAL_NAME__ : "WPSK";

function resolveGlobalName(override) {
  return override || FALLBACK_GLOBAL;
}

/**
 * Read the `hooks` instance from the global namespace.
 *
 * Returns `undefined` if the global namespace is not present (i.e. the deps
 * bundle has not loaded yet) or if `globalName` cannot be resolved.
 *
 * @param {string} [globalName]  Override the config-driven global name.
 * @returns {object|undefined}
 */
export function getHooks(globalName) {
  const name = resolveGlobalName(globalName);
  if (!name) return undefined;
  const root = globalThis[name];
  return root && root.hooks ? root.hooks : undefined;
}

/**
 * Default export is a getter function — re-reads the global on every call.
 * Mirrors `getHooks()` with no argument.
 */
const defaultExport = function defaultHooks() {
  return getHooks();
};

export default defaultExport;
