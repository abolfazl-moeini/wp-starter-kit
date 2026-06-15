/**
 * @wpsk/create-wp-project — js:flow generator (Phase 21).
 *
 * The Flow variant of the `js` feature. Emits a Flow-typed
 * dependencies entry (with the `// @flow` pragma), a
 * `.flowconfig` file, and adds `flow-bin` as a dev dependency
 * plus a `typecheck:flow` npm script. NO `tsconfig.json` —
 * Flow replaces TypeScript's type-checker for this variant.
 *
 * The full Flow dependencies template ships in Phase 25.C;
 * for Phase 21 we emit a minimal valid stub that the test
 * suite asserts.
 */

import { renderTemplate } from "../_templates.js";

const TEMPLATE_DEPENDENCIES_JS_FLOW = `// @flow
/**
 * {{globalName}} — dependencies bundle entry (Flow-typed).
 *
 * Phase 21 stub — the full Flow template ships in Phase 25.C.
 */

import { createHooks } from '@wordpress/hooks';
import domReady from '@wordpress/dom-ready';

export const hooks = createHooks();

export const table = { Tabulator: (window: any).Tabulator };

domReady(() => {
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-start',
    'theme',
    (_endpoint: string, options: ?{ disableLoading?: boolean }) => {
      if (!options || !options.disableLoading) {
        document.body.classList.add('is-loading');
      }
    }
  );
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-done',
    'theme',
    (_endpoint: string, options: ?{ disableLoading?: boolean }) => {
      if (!options || !options.disableLoading) {
        document.body.classList.remove('is-loading');
      }
    }
  );
});
`;

const TEMPLATE_FLOW_CONFIG = `[ignore]
.*/node_modules/.*
.*/build/.*
.*/dist/.*

[include]
assets/**

[libs]

[options]
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
        TEMPLATE_DEPENDENCIES_JS_FLOW,
        tpl,
      ),
      ".flowconfig": renderTemplate(TEMPLATE_FLOW_CONFIG, tpl),
    },
    dirs: ["assets"],
    deps: {},
    devDeps: {
      "flow-bin": "^0.234.0",
    },
  };
}

export const descriptor = {
  id: "js:flow",
  feature: "js",
  variant: "flow",
  owns: ["assets/dependencies.js", ".flowconfig"],
  run,
};
