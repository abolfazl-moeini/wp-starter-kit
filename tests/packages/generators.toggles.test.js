/**
 * Phase 21.7 / 21.8 — toggle generators.
 *
 * Every "toggle" feature ships a one-file generator that:
 *   - reads `ctx.features`
 *   - early-returns an empty contribution when the feature is OFF
 *   - emits its files (and devDeps) when ON
 *
 * Contracts locked here:
 *
 *  1. husky         (on/off)   → .husky/pre-commit when on
 *  2. vendorScoping (on/off)   → strauss.json WITHOUT "WPSK" in
 *                                 exclude_from_prefix when on
 *  3. exampleFeature(on/off)   → src/Modules/ExampleFeature/* when on
 *  4. restBatch     (off/on)   → no files (Phase 25) but the gate
 *                                 filters it out for js:none
 *  5. i18n          (on/off)   → languages/.gitkeep when on
 *  6. phpTest       (phpunit/none) → phpunit.xml + bootstrap.php
 *                                 when phpunit
 *  7. license       (gpl2/gpl3/mit) → LICENSE file with the right
 *                                 body, for any license variant
 *  8. blocks        (off/on)   → src/Modules/Blocks/* when on +
 *                                 js ≠ none + wpMinVersion ≥ 5.8
 *  9. css           (none/sass/tailwind/postcss) → variant config
 *                                 file when ≠ none + js ≠ none
 *
 * The gate (registry filter) is already tested in
 * generators.registry.test.js. Here we exercise the generator
 * functions themselves, calling run(ctx) directly with a
 * feature set that's permissive (everything else on) and
 * toggling only the one feature under test.
 */

import { describe, test, expect } from "@jest/globals";

import { run as huskyRun } from "../../packages/create-wp-project/src/generators/husky.js";
import { run as vendorScopingRun } from "../../packages/create-wp-project/src/generators/vendorScoping.js";
import { run as exampleFeatureRun } from "../../packages/create-wp-project/src/generators/exampleFeature.js";
import { run as restBatchRun } from "../../packages/create-wp-project/src/generators/restBatch.js";
import { run as i18nRun } from "../../packages/create-wp-project/src/generators/i18n.js";
import { run as phpTestRun } from "../../packages/create-wp-project/src/generators/phpTest.js";
import { run as licenseRun } from "../../packages/create-wp-project/src/generators/license.js";
import { run as blocksRun } from "../../packages/create-wp-project/src/generators/blocks.js";
import { run as cssRun } from "../../packages/create-wp-project/src/generators/css.js";

function makeCtx(answers = {}, cfg = {}, features = {}) {
  const a = {
    slug: "my-project",
    npmScope: "myorg",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
    projectType: "plugin",
    ...answers,
  };
  const c = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar,
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: "@" + a.npmScope,
    depsBundle: a.depsBundle,
    phpFunctionPrefix: a.phpFunctionPrefix,
    uiFramework: a.uiFramework,
    projectType: a.projectType,
    restNamespace: "wpsk/v1",
    vendorPrefix: "WpskVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
    ...cfg,
  };
  // Permissive default — every feature on EXCEPT the ones the test
  // wants to flip off. Tests pass only the features they want to
  // override via the `features` argument.
  const f = {
    js: "typescript",
    jsLib: "none",
    jsTest: "jest",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "on",
    css: "none",
    blocks: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
    exampleFeature: "on",
    i18n: "on",
    ...features,
  };
  return { answers: a, cfg: c, features: f };
}

describe("husky generator (Phase 21.7/21.8)", () => {
  test("emits .husky/pre-commit when husky=on", () => {
    const out = huskyRun(makeCtx({}, {}, { husky: "on" }));
    expect(out.files[".husky/pre-commit"]).toBeDefined();
    expect(out.files[".husky/pre-commit"]).toMatch(/lint-staged/);
  });

  test("emits nothing when husky=off (early-return)", () => {
    const out = huskyRun(makeCtx({}, {}, { husky: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("reports husky + lint-staged as devDeps when on", () => {
    const out = huskyRun(makeCtx({}, {}, { husky: "on" }));
    expect(out.devDeps.husky).toBeDefined();
    expect(out.devDeps["lint-staged"]).toBeDefined();
  });
});

describe("vendorScoping generator (Phase 21.7/21.8)", () => {
  test("emits strauss.json WITHOUT 'WPSK' in exclude_from_prefix when on (§0.4.1)", () => {
    const out = vendorScopingRun(makeCtx({}, {}, { vendorScoping: "on" }));
    expect(out.files["strauss.json"]).toBeDefined();
    expect(out.files["strauss.json"]).not.toMatch(/"WPSK"/);
  });

  test("emits nothing when vendorScoping=off", () => {
    const out = vendorScopingRun(makeCtx({}, {}, { vendorScoping: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("exampleFeature generator (Phase 21.7/21.8)", () => {
  test("emits the ExampleFeature module (Module.php + Rest/ItemsController.php + assets/entries/admin.ts) when on", () => {
    const out = exampleFeatureRun(makeCtx({}, {}, { exampleFeature: "on" }));
    expect(out.files["src/Modules/ExampleFeature/Module.php"]).toBeDefined();
    expect(
      out.files["src/Modules/ExampleFeature/Rest/ItemsController.php"],
    ).toBeDefined();
    expect(
      out.files["src/Modules/ExampleFeature/assets/entries/admin.ts"],
    ).toBeDefined();
    // Body sanity-check (RestSetup::register is the canonical kit
    // wiring — see src/Modules/ExampleFeature/Module.php).
    expect(out.files["src/Modules/ExampleFeature/Module.php"]).toMatch(
      /RestSetup::register/,
    );
    expect(
      out.files["src/Modules/ExampleFeature/Rest/ItemsController.php"],
    ).toMatch(/BatchResponse::wrap/);
  });

  test("emits nothing when exampleFeature=off", () => {
    const out = exampleFeatureRun(makeCtx({}, {}, { exampleFeature: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("restBatch generator (Phase 21.7/21.8)", () => {
  test("emits no files in Phase 21 (full JS bundle lands in Phase 25)", () => {
    const out = restBatchRun(makeCtx({}, {}, { restBatch: "on" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("emits nothing when restBatch=off", () => {
    const out = restBatchRun(makeCtx({}, {}, { restBatch: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("emits nothing when restBatch=on but js=none (defence in depth)", () => {
    const out = restBatchRun(makeCtx({}, {}, { restBatch: "on", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("i18n generator (Phase 21.7/21.8)", () => {
  test("emits languages/.gitkeep when i18n=on", () => {
    const out = i18nRun(makeCtx({}, {}, { i18n: "on" }));
    expect(out.files["languages/.gitkeep"]).toBeDefined();
  });

  test("emits nothing when i18n=off", () => {
    const out = i18nRun(makeCtx({}, {}, { i18n: "off" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("phpTest generator (Phase 21.7/21.8)", () => {
  test("emits phpunit.xml + tests/phpunit/bootstrap.php when phpTest=phpunit", () => {
    const out = phpTestRun(makeCtx({}, {}, { phpTest: "phpunit" }));
    expect(out.files["phpunit.xml"]).toBeDefined();
    expect(out.files["tests/phpunit/bootstrap.php"]).toBeDefined();
    // Body sanity: phpunit.xml must reference the tests directory.
    expect(out.files["phpunit.xml"]).toMatch(
      /<directory>tests\/phpunit<\/directory>/,
    );
    // bootstrap must require the autoloader.
    expect(out.files["tests/phpunit/bootstrap.php"]).toMatch(
      /vendor\/autoload\.php/,
    );
  });

  test("emits nothing when phpTest=none", () => {
    const out = phpTestRun(makeCtx({}, {}, { phpTest: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("license generator (Phase 21.7/21.8)", () => {
  test("emits LICENSE for license=gpl2 with the GPL-2 header", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "gpl2" }));
    expect(out.files["LICENSE"]).toBeDefined();
    expect(out.files["LICENSE"]).toMatch(/GNU GENERAL PUBLIC LICENSE/i);
    expect(out.files["LICENSE"]).toMatch(/Version 2/);
  });

  test("emits LICENSE for license=gpl3 with the GPL-3 header", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "gpl3" }));
    expect(out.files["LICENSE"]).toMatch(/GNU GENERAL PUBLIC LICENSE/i);
    expect(out.files["LICENSE"]).toMatch(/Version 3/);
  });

  test("emits LICENSE for license=mit with the MIT header", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "mit" }));
    expect(out.files["LICENSE"]).toMatch(/MIT License/);
  });

  test("emits nothing when license is missing/falsy (defence in depth)", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("emits nothing for an unknown license variant (defence in depth)", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "apache-2.0" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("blocks generator (Phase 21.7/21.8)", () => {
  test("emits src/Modules/Blocks/* when blocks=on + js=typescript + wpMinVersion=6.0", () => {
    const out = blocksRun(
      makeCtx({}, {}, { blocks: "on", js: "typescript", wpMinVersion: "6.0" }),
    );
    expect(out.files["src/Modules/Blocks/block.json"]).toBeDefined();
    expect(out.files["src/Modules/Blocks/Module.php"]).toBeDefined();
    expect(out.files["src/Modules/Blocks/index.ts"]).toBeDefined();
    // body sanity: block.json has the WP schema + the entry points to index.ts
    const bj = JSON.parse(out.files["src/Modules/Blocks/block.json"]);
    expect(bj.$schema).toMatch(/wp\.org\/trunk\/block\.json/);
    expect(bj.editorScript).toBe("file:./index.ts");
    // namespace uses consumer's vendor (derived from globalName); use imports reference WPSK framework
    expect(out.files["src/Modules/Blocks/Module.php"]).toMatch(
      /namespace\s+MyProject\\Modules\\Blocks/,
    );
    expect(out.files["src/Modules/Blocks/Module.php"]).toMatch(
      /use\s+WPSK\\Core\\ModuleInterface/,
    );
  });

  test("emits nothing when blocks=off", () => {
    const out = blocksRun(makeCtx({}, {}, { blocks: "off", js: "typescript" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("emits nothing when blocks=on but js=none (defence in depth)", () => {
    const out = blocksRun(makeCtx({}, {}, { blocks: "on", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});

describe("css generator (Phase 21.7/21.8)", () => {
  test("emits .sassrc when css=sass + js=typescript", () => {
    const out = cssRun(makeCtx({}, {}, { css: "sass", js: "typescript" }));
    expect(out.files[".sassrc"]).toBeDefined();
    expect(out.devDeps.sass).toBeDefined();
  });

  test("emits tailwind.config.js when css=tailwind + js=typescript", () => {
    const out = cssRun(makeCtx({}, {}, { css: "tailwind", js: "typescript" }));
    expect(out.files["tailwind.config.js"]).toBeDefined();
    expect(out.devDeps.tailwindcss).toBeDefined();
  });

  test("emits postcss.config.js when css=postcss + js=typescript", () => {
    const out = cssRun(makeCtx({}, {}, { css: "postcss", js: "typescript" }));
    expect(out.files["postcss.config.js"]).toBeDefined();
    expect(out.devDeps.postcss).toBeDefined();
  });

  test("emits nothing when css=none", () => {
    const out = cssRun(makeCtx({}, {}, { css: "none", js: "typescript" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("emits nothing when css=sass but js=none (defence in depth)", () => {
    const out = cssRun(makeCtx({}, {}, { css: "sass", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});
