/**
 * @wpsk/create-wp-project — exampleFeature generator (Phase 21).
 *
 * The ExampleFeature demo module (Module.php, Rest/ItemsController.php,
 * assets/entries/admin.ts) is the canonical "this is how a feature
 * module looks in this kit" reference. When the feature is on, the
 * generator emits the full module under src/Modules/ExampleFeature/.
 * When off, src/Modules/ is empty (and the user adds their own
 * modules from scratch).
 *
 * The bodies are inherited verbatim from the legacy inline templates
 * (Phase 11) — same PSR-4 namespace pattern, same
 * `RestSetup::register(ItemsController::class)` wiring, same
 * `domReady` admin entry. Phase 21.7/21.8 only moves the strings
 * to a generator; the actual content lands in Phase 25.
 */

import { renderTemplate } from "./_templates.js";
import {
  TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP,
  TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER,
  TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS,
} from "./_templates.js";

export function run(ctx) {
  if (ctx.features.exampleFeature !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  return {
    files: {
      "src/Modules/ExampleFeature/Module.php": renderTemplate(
        TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP,
        tpl,
      ),
      "src/Modules/ExampleFeature/Rest/ItemsController.php": renderTemplate(
        TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER,
        tpl,
      ),
      "src/Modules/ExampleFeature/assets/entries/admin.ts": renderTemplate(
        TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS,
        tpl,
      ),
    },
    dirs: [
      "src/Modules/ExampleFeature",
      "src/Modules/ExampleFeature/Rest",
      "src/Modules/ExampleFeature/assets/entries",
    ],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "exampleFeature",
  feature: "exampleFeature",
  owns: [
    "src/Modules/ExampleFeature/Module.php",
    "src/Modules/ExampleFeature/Rest/ItemsController.php",
    "src/Modules/ExampleFeature/assets/entries/admin.ts",
  ],
  run,
};
