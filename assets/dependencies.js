/**
 * assets/dependencies.js — the deps bundle entry point.
 *
 * Bundled by `core/packages/build/esbuild-dependencies.js` (IIFE format, global
 * name from `project.config.json → globalName`). Components bundles then
 * import from this global — they MUST NOT bundle a second `createHooks()`.
 *
 * The template lives here so it gets carried forward when the starter kit is
 * consumed (the build step reads `assets/dependencies.js` from the project
 * root). Edit it to register new cross-bundle hooks/aliases; the comments
 * mark which tokens are build-time-replaced.
 *
 * Build-time placeholders (esbuild `define` would inject these; until the
 * build pipeline is wired they appear as `<hookPrefix>` literal placeholders
 * in the source for reviewability):
 *
 *   <hookPrefix>  ← project.config.json → hookPrefix
 *   <globalName>  ← project.config.json → globalName
 *   <npmScope>    ← project.config.json → npmScope (e.g. @wpsk)
 */
import { createHooks } from '@wordpress/hooks';
import { FreezeUI, UnFreezeUI } from '@wpsk/html-utils';

// dom-ready shim. @wordpress/dom-ready is the canonical choice but is an
// optional runtime dep; we fall back to rAF so this template loads even when
// the project hasn't installed it yet.
const domReady =
  typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
    ? (cb) => window.requestAnimationFrame(cb)
    : (cb) => setTimeout(cb, 0);

/**
 * The hooks singleton — the only `createHooks()` instance in the whole
 * project. Component bundles read it via `@wpsk/hooks → getHooks()`.
 */
export const hooks = createHooks();

/**
 * Tabulator bridge (1.6 third-party library pattern). The WordPress-enqueued
 * `window.Tabulator` global is exposed under the IIFE global so that
 * `import { Tabulator } from 'tabulator-tables'` resolves to
 * `<globalName>.table.Tabulator` at bundle time.
 */
export const table = {
  Tabulator: typeof window !== 'undefined' ? window.Tabulator : undefined,
};

/**
 * Default-form export of the project's `@wpsk/utils` namespace, so consumers
 * can reach `localize` / `objectMap` / `formData2Object` via the same IIFE
 * global without a second bundle.
 *
 * `export * as utils` is bundled by esbuild's IIFE wrapper as
 * `<globalName>.utils = { localize, objectMap, formData2Object }`.
 */
export * as utils from '@wpsk/utils';

domReady(() => {
  // <hookPrefix>-request-ajax-start — fired by @wpsk/rest-utils before any
  // REST / X-URL request. We use the spinner overlay as the loading signal.
  hooks.addAction(
    '<hookPrefix>-request-ajax-start',
    'wpsk-deps-bundle',
    (endpoint, options = {}) => {
      if (!options?.disableLoading) FreezeUI();
    },
  );

  // <hookPrefix>-request-ajax-done — fired in `finally` by @wpsk/rest-utils.
  hooks.addAction(
    '<hookPrefix>-request-ajax-done',
    'wpsk-deps-bundle',
    (endpoint, options = {}) => {
      if (!options?.disableLoading) UnFreezeUI();
    },
  );

  // <hookPrefix>-form-init — fired by MLForm on first render.
  hooks.addAction(
    '<hookPrefix>-form-init',
    'wpsk-deps-bundle',
    (container) => {
      if (!container) return;
      // Re-exported from @wpsk/html-utils; the local import (top of file)
      // and the global re-export are two distinct bindings — keep them so
      // the deps bundle can act as a fallback for consumers that loaded
      // the global before the html-utils package was imported.
      try {
        const htmlUtils = require('@wpsk/html-utils');
        htmlUtils.initDatepicker?.(container);
        htmlUtils.initFormatNumbers?.(container);
      } catch (_) {
        // html-utils is optional at this stage; silently no-op.
      }
    },
  );

  // <hookPrefix>-form-changed — fired by MLForm on any input change.
  hooks.addAction(
    '<hookPrefix>-form-changed',
    'wpsk-deps-bundle',
    (container, changedElementName) => {
      if (!container || !changedElementName) return;
      try {
        const htmlUtils = require('@wpsk/html-utils');
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
 */
if (typeof Element !== 'undefined') {
  if (!Element.prototype.matches) {
    Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (selector) {
      let el = this;
      do {
        if (Element.prototype.matches.call(el, selector)) return el;
        el = el.parentElement || el.parentNode;
      } while (el !== null && el.nodeType === 1);
      return null;
    };
  }
}
