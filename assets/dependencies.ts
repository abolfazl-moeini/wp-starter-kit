/**
 * assets/dependencies.js — the deps bundle entry point.
 *
 * Bundled by `core/packages/build/esbuild-dependencies.js` (IIFE format, global
 * name from `project.config.json → globalName`). Components bundles then
 * import from this global — they MUST NOT bundle a second `createHooks()`.
 *
 * The template lives here so it gets carried forward when the starter kit is
 * consumed (the build step reads `assets/dependencies.js` from the project
 * root). Edit it to register new cross-bundle hooks/aliases.
 *
 * Hook prefix is injected at build time via esbuild `define` (see
 * buildDepsConfig) so that editing only `project.config.json` and re-running
 * the build is sufficient to re-brand hook action names for the kit itself.
 */

// @ts-nocheck -- legacy global-bridge code (Tabulator, Element.prototype polyfills,
// injected __WPDEV_* defines, loose callbacks for hook actions). The rest of the
// project is strict; this file is special as the IIFE deps entry.

import { createHooks } from "@wordpress/hooks";
import { FreezeUI, UnFreezeUI } from "@wpdev/html-utils";

// dom-ready shim. @wordpress/dom-ready is the canonical choice but is an
// optional runtime dep; we fall back to rAF so this template loads even when
// the project hasn't installed it yet.
const domReady =
  typeof window !== "undefined" &&
  typeof window.requestAnimationFrame === "function"
    ? (cb) => window.requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 0);

/**
 * The hooks singleton — the only `createHooks()` instance in the whole
 * project. Component bundles read it via `@wpdev/hooks → getHooks()`.
 */
export const hooks = createHooks();

/**
 * Tabulator bridge (1.6 third-party library pattern). The WordPress-enqueued
 * `window.Tabulator` global is exposed under the IIFE global so that
 * `import { Tabulator } from 'tabulator-tables'` resolves to
 * `<globalName>.table.Tabulator` at bundle time.
 */
export const table = {
  Tabulator: typeof window !== "undefined" ? window.Tabulator : undefined,
};

/**
 * Default-form export of the project's `@wpdev/utils` namespace, so consumers
 * can reach `localize` / `objectMap` / `formData2Object` via the same IIFE
 * global without a second bundle.
 *
 * `export * as utils` is bundled by esbuild's IIFE wrapper as
 * `<globalName>.utils = { localize, objectMap, formData2Object }`.
 */
export * as utils from "@wpdev/utils";

// __WPDEV_HOOK_PREFIX__ and __WPDEV_LOCALIZE_VAR__ are replaced at esbuild
// bundle time by defines coming from project.config.json (see buildDepsConfig).
// This is what allows re-branding the *kit itself* (editing only the config
// + npm run build) for hook actions that are registered inside this entry.

domReady(() => {
  // <hookPrefix>-request-ajax-start — fired by @wpdev/rest-utils before any
  // REST / X-URL request. We use the spinner overlay as the loading signal.
  hooks.addAction(
    __WPDEV_HOOK_PREFIX__ + "-request-ajax-start",
    "wpsk-deps-bundle",
    (endpoint: string, options: { disableLoading?: boolean } = {}) => {
      if (!options?.disableLoading) FreezeUI();
    },
  );

  // <hookPrefix>-request-ajax-done — fired in `finally` by @wpdev/rest-utils.
  hooks.addAction(
    __WPDEV_HOOK_PREFIX__ + "-request-ajax-done",
    "wpsk-deps-bundle",
    (endpoint: string, options: { disableLoading?: boolean } = {}) => {
      if (!options?.disableLoading) UnFreezeUI();
    },
  );

  // <hookPrefix>-form-init — fired by WDForm on first render.
  hooks.addAction(
    __WPDEV_HOOK_PREFIX__ + "-form-init",
    "wpsk-deps-bundle",
    (container: Element | null) => {
      if (!container) return;
      // Re-exported from @wpdev/html-utils; the local import (top of file)
      // and the global re-export are two distinct bindings — keep them so
      // the deps bundle can act as a fallback for consumers that loaded
      // the global before the html-utils package was imported.
      try {
        const htmlUtils = require("@wpdev/html-utils");
        htmlUtils.initDatepicker?.(container);
        htmlUtils.initFormatNumbers?.(container);
      } catch (_) {
        // html-utils is optional at this stage; silently no-op.
      }
    },
  );

  // <hookPrefix>-form-changed — fired by WDForm on any input change.
  hooks.addAction(
    __WPDEV_HOOK_PREFIX__ + "-form-changed",
    "wpsk-deps-bundle",
    (container: Element | null, changedElementName?: string) => {
      if (!container || !changedElementName) return;
      try {
        const htmlUtils = require("@wpdev/html-utils");
        htmlUtils.SwitchableFocusElement?.(container, changedElementName);
      } catch (_) {
        // no-op
      }
    },
  );
});

/**
 * Element.prototype polyfills — a few legacy browsers (and some test
 * environments) lack `matches` / `closest`. The deps bundle is the natural
 * place to ship these because every component bundle loads it first.
 *
 * These are intentional global augmentations for the bundled IIFE.
 */
declare global {
  interface Element {
    msMatchesSelector?: (selector: string) => boolean;
    webkitMatchesSelector?: (selector: string) => boolean;
  }
}

if (typeof Element !== "undefined") {
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector ||
      (function (this: Element, selector: string) {
        // Fallback (very old environments)
        const el = this as any;
        return el.querySelector ? !!el.querySelector(selector) : false; // best effort
      } as any);
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector: string): Element | null {
      let el: Element | null = this;
      do {
        // @ts-ignore - matches may have been polyfilled above
        if (el.matches && el.matches(selector)) return el;
        el = el.parentElement || (el.parentNode as Element | null);
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }
}
