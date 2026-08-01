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
 *   getHooks().doAction('wpdev-form-init', container);
 *
 *   import { getHooks } from '@wpdev/hooks';
 *   getHooks('MyApp').addAction(...);
 */

const FALLBACK_GLOBAL =
  typeof __WPDEV_GLOBAL_NAME__ !== "undefined"
    ? __WPDEV_GLOBAL_NAME__
    : "WPDev";

function resolveGlobalName(override) {
  return override || FALLBACK_GLOBAL;
}

/**
 * Walk a dotted global path on `globalThis`.
 * Supports esbuild nested IIFE names: `Brand.Product` → globalThis.Brand.Product.
 *
 * @param {string} pathName
 * @returns {object | undefined}
 */
function resolveGlobalRoot(pathName) {
  if (!pathName || typeof pathName !== "string") return undefined;
  const parts = pathName.split(".").filter(Boolean);
  if (parts.length === 0) return undefined;

  let current = globalThis;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current && typeof current === "object" ? current : undefined;
}

/**
 * Read the `hooks` instance from the global namespace.
 *
 * Returns `undefined` if the global namespace is not present (i.e. the deps
 * bundle has not loaded yet) or if `globalName` cannot be resolved.
 *
 * `globalName` may be a single identifier (`WPDev`) or a dotted path
 * (`Brand.Product`) matching esbuild's nested `globalName` option.
 *
 * @param {string} [globalName]  Override the config-driven global name.
 * @returns {import('./types.js').HooksInstance | undefined}
 */
export function getHooks(globalName) {
  const name = resolveGlobalName(globalName);
  if (!name) return undefined;
  const root = resolveGlobalRoot(name);
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
