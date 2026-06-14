/**
 * @wpsk/hooks — config-driven accessor for the deps-bundle hooks instance.
 *
 * The actual `hooks` object lives on the IIFE global created by
 * `assets/dependencies.js` (see @wordpress/hooks `createHooks()`). Component
 * bundles must not bundle a second `createHooks()` — they must read from the
 * global, otherwise the dispatch/registration halves of the hook system
 * would diverge.
 *
 * `globalName` is read from `project.config.json` (via `@core/utils`).
 * Consumers can also call `getHooks(globalName)` directly to override
 * per-call (useful in tests and for cross-project re-use).
 *
 * Both the default export (a getter function) and the named `getHooks`
 * accessor are provided for ergonomics:
 *
 *   import getHooks from '@wpsk/hooks';
 *   getHooks().doAction('wpsk-form-init', container);
 *
 *   import { getHooks } from '@wpsk/hooks';
 *   getHooks('MyApp').addAction(...);
 *
 * Resolving `globalName` lazily on every call is intentional: the deps
 * bundle may load AFTER consumers are imported (script-handle ordering),
 * and the config file may be in flux during tests.
 */
import { readProjectConfig } from '@core/utils';

function resolveGlobalName(override) {
  if (override) return override;
  try {
    const config = readProjectConfig();
    return config?.globalName ?? null;
  } catch {
    // No project.config.json — caller will get undefined.
    return null;
  }
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
 * Mirrors `getHooks()` with no argument, deferring to `project.config.json`.
 */
const defaultExport = function defaultHooks() {
  return getHooks();
};

export default defaultExport;
