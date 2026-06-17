/**
 * @wpdev/create-wp-project — js:flow generator (Phase 21 + Phase 25.C).
 *
 * The Flow variant of the `js` feature. Emits a Flow-typed
 * dependencies entry (with the `// @flow` pragma), a
 * `.flowconfig` file, and adds `flow-bin` as a dev dependency
 * plus a `typecheck:flow` npm script. NO `tsconfig.json` —
 * Flow replaces TypeScript's type-checker for this variant.
 *
 * Phase 25.C additions:
 *  - The dependencies template now uses full Flow type
 *    annotations on the optional-parameter shape and the
 *    `hooks` action handlers.
 *  - The `.flowconfig` includes the standard `[lints]`,
 *    `[strict]`, and `[version]` blocks so a freshly
 *    generated Flow project has a sensible default check.
 *  - A `typecheck:flow` script reference in the core's
 *    `packageJsonForAnswers` (Phase 25.B) — this generator
 *    itself does NOT emit `package.json`, but it does
 *    contribute `flow-bin` as a devDep so the scaffold's
 *    package.json merge picks it up.
 *
 * The build pipeline (esbuild + jest transforms) is in
 * `core/packages/build/` and the root `jest.config.*` — both
 * out of scope for this generator. The esbuild `js` loader
 * treats `.js` as JSX by default; downstream tooling in the
 * build pipeline is responsible for adding `@babel/preset-flow`
 * (or running `flow-remove-types` as a pre-step) so the
 * consumer's source-level Flow types are stripped at bundle
 * time. The `.flowconfig` and `// @flow` pragma are the
 * SOURCE-side contract — they tell the Flow checker what's
 * Flow-typed and what isn't.
 */

import { renderTemplate } from "../_templates.js";

const TEMPLATE_DEPENDENCIES_JS_FLOW = `// @flow
/**
 * {{globalName}} — dependencies bundle entry (Flow-typed).
 *
 * Phase 25.C: full Flow type annotations. Build-side stripping
 * (esbuild + @babel/preset-flow, or flow-remove-types) drops
 * the annotations at bundle time; the .flowconfig + this
 * pragma are the source-of-truth contract for the Flow
 * type-checker.
 */

import { createHooks } from '@wordpress/hooks';
import domReady from '@wordpress/dom-ready';

type AjaxOptions = $ReadOnly<{ disableLoading?: boolean }>;

export const hooks = createHooks();

export const table = { Tabulator: (window: any).Tabulator };

domReady(() => {
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-start',
    'theme',
    (_endpoint: string, options: ?AjaxOptions) => {
      if (!options || !options.disableLoading) {
        document.body.classList.add('is-loading');
      }
    }
  );
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-done',
    'theme',
    (_endpoint: string, options: ?AjaxOptions) => {
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
.*/vendor/.*

[include]
assets/**

[libs]

[lints]

[options]
all=false

[strict]
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
