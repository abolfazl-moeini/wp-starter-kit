/**
 * @wpdev/create-wp-project — js:pure generator (Phase 21).
 *
 * The pure-JS variant of the `js` feature. Emits a plain JS
 * dependencies entry (no TypeScript syntax, no `tsconfig.json`
 * from this generator — core handles the tsconfig gate). The
 * full pure-JS template ships in Phase 25.B; for Phase 21 we
 * emit a minimal valid stub that the test suite asserts.
 */

import { renderTemplate } from "../_templates.js";

/**
 * Phase 21 stub for js:pure. Replaced in Phase 25.B with the
 * full template. The body intentionally mirrors the structure
 * of the TS variant (so Phase 25.B can grow it without breaking
 * Phase 21 tests) but with no TypeScript syntax — every type
 * annotation is dropped.
 */
const TEMPLATE_DEPENDENCIES_JS_PURE = `/**
 * {{globalName}} — dependencies bundle entry (plain JavaScript).
 *
 * Phase 21 stub — the full pure-JS template ships in Phase 25.B.
 */

import { createHooks } from '@wordpress/hooks';
import domReady from '@wordpress/dom-ready';

export const hooks = createHooks();

export const table = { Tabulator: window.Tabulator };

domReady(() => {
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-start',
    'theme',
    (_endpoint, options) => {
      if (!options || !options.disableLoading) {
        document.body.classList.add('is-loading');
      }
    }
  );
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-done',
    'theme',
    (_endpoint, options) => {
      if (!options || !options.disableLoading) {
        document.body.classList.remove('is-loading');
      }
    }
  );
});
`;

export function run(ctx) {
  const { answers, vars } = ctx;
  const tpl = vars || {
    ...answers,
    ...(ctx.cfg || {}),
  };
  return {
    files: {
      "assets/dependencies.js": renderTemplate(
        TEMPLATE_DEPENDENCIES_JS_PURE,
        tpl,
      ),
    },
    dirs: ["assets"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "js:pure",
  feature: "js",
  variant: "pure",
  owns: ["assets/dependencies.js"],
  run,
};
