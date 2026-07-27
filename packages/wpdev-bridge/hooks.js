/**
 * @wpdev/wpdev-bridge/hooks
 *
 * Compatibility layer that prefers the starter-kit deps-bundle hooks
 * (`@wpdev/hooks` → globalName.hooks) and falls back to WordPress
 * `wp.hooks` so existing WPDev extension points keep working.
 */

import { getHooks as getKitHooks } from "@wpdev/hooks";

/**
 * @typedef {{
 *   doAction: (hookName: string, ...args: unknown[]) => void,
 *   applyFilters: (hookName: string, value: unknown, ...args: unknown[]) => unknown,
 *   addAction: (hookName: string, namespace: string, callback: Function, priority?: number) => void,
 *   addFilter: (hookName: string, namespace: string, callback: Function, priority?: number) => unknown,
 *   removeAction?: (hookName: string, namespace: string) => void,
 *   removeFilter?: (hookName: string, namespace: string) => void,
 * }} HooksLike
 */

/**
 * Resolve a hooks instance.
 *
 * Order:
 * 1. starter-kit deps global via `@wpdev/hooks`
 * 2. `window.wp.hooks` (WPDev / WP core)
 * 3. no-op stub (safe for SSR / early boot)
 *
 * @param {string} [kitGlobalName]
 * @returns {HooksLike}
 */
export function getWpdevHooks(kitGlobalName) {
  const kit = getKitHooks(kitGlobalName);
  if (kit && typeof kit.doAction === "function") {
    return kit;
  }

  const wpHooks = globalThis.wp && globalThis.wp.hooks;
  if (wpHooks && typeof wpHooks.doAction === "function") {
    return wpHooks;
  }

  return createNoopHooks();
}

/**
 * @returns {HooksLike}
 */
export function createNoopHooks() {
  return {
    doAction() {},
    applyFilters(_name, value) {
      return value;
    },
    addAction() {},
    addFilter(_name, _ns, callback) {
      return callback;
    },
    removeAction() {},
    removeFilter() {},
  };
}

/**
 * Fire a WPDev-style action if hooks are available.
 *
 * @param {string} hookName
 * @param {...*} args
 */
export function doWpdevAction(hookName, ...args) {
  getWpdevHooks().doAction(hookName, ...args);
}

/**
 * Apply a WPDev-style filter if hooks are available.
 *
 * @param {string} hookName
 * @param {*} value
 * @param {...*} args
 * @returns {*}
 */
export function applyWpdevFilters(hookName, value, ...args) {
  return getWpdevHooks().applyFilters(hookName, value, ...args);
}
