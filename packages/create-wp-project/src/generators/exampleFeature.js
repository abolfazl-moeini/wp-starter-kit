/**
 * @wpdev/create-wp-project — exampleFeature generator (Phase 21).
 *
 * The ExampleFeature demo module (Module.php, Rest/ItemsController.php,
 * assets/entries/admin.ts) is the canonical "this is how a feature
 * module looks in this kit" reference. When the feature is on, the
 * generator emits the full module under src/Modules/ExampleFeature/.
 * When off, src/Modules/ is empty (and the user adds their own
 * modules from scratch).
 */

import { renderTemplate } from "./_templates.js";
import {
  TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP,
  TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER,
  TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS,
  TEMPLATE_EXAMPLE_FEATURE_MODULE_TEST_PHP,
  TEMPLATE_EXAMPLE_FEATURE_ADMIN_TEST_TS,
} from "./_templates.js";

export function run(ctx) {
  if (ctx.features.exampleFeature !== "on") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const tpl = ctx.vars || { ...ctx.answers, ...(ctx.cfg || {}) };
  const files = {
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
  };
  const dirs = [
    "src/Modules/ExampleFeature",
    "src/Modules/ExampleFeature/Rest",
    "src/Modules/ExampleFeature/assets/entries",
  ];

  if (ctx.features.phpTest === "phpunit") {
    files["tests/phpunit/Modules/ExampleFeature/ModuleTest.php"] =
      renderTemplate(TEMPLATE_EXAMPLE_FEATURE_MODULE_TEST_PHP, tpl);
    dirs.push("tests/phpunit/Modules/ExampleFeature");
  }

  const jsTest = ctx.features.jsTest || "jest";
  if (jsTest === "jest" && ctx.features.js !== "none") {
    files[
      "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts"
    ] = TEMPLATE_EXAMPLE_FEATURE_ADMIN_TEST_TS;
    dirs.push("src/Modules/ExampleFeature/assets/entries/__tests__");
  }

  return {
    files,
    dirs,
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
    "tests/phpunit/Modules/ExampleFeature/ModuleTest.php",
    "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts",
  ],
  run,
};