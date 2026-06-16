/**
 * Phase 25.C — js:flow variant generator.
 *
 * The Flow variant of the `js` feature emits a Flow-typed
 * dependencies entry (with the `// @flow` pragma) plus a
 * `.flowconfig` file. Phase 21 already locks the *variant
 * generator* contract. Phase 25.C locks the *scaffold output*
 * contract: when the consumer picks `js:flow`, the generated
 * kit project must:
 *
 *   1. Have an `assets/dependencies.js` whose first non-comment
 *      line is `// @flow` (the Flow pragma).
 *   2. Have a `.flowconfig` with the standard `[ignore]` block
 *      that ignores node_modules.
 *   3. Have a `package.json` whose `devDependencies` includes
 *      `flow-bin` (so `npm install` pulls in the Flow binary).
 *   4. Have a `package.json` whose `scripts.typecheck` is
 *      `flow` (NOT `tsc --noEmit` — Flow replaces TypeScript's
 *      type-checker for this variant).
 *   5. NOT have a `tsconfig.json` (TypeScript is not in play).
 *
 * The variant generator's `devDeps` contribution already
 * declares `flow-bin`; the core generator merges those into
 * the final package.json devDependencies (Phase 22). Tests 3
 * and 4 are integration assertions on the merged result.
 *
 * NOTE: this test file lives under `tests/packages/` and is
 * FILTER-RUN (`npm test -- generators.jsFlow`) because the
 * parallel workers are also adding RED tests in this
 * directory and the full `npm test` is expected to be dirty
 * while multiple workers are in flight.
 */

import { describe, test, expect } from "@jest/globals";

import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import {
  run as flowRun,
  descriptor as flowDescriptor,
} from "../../packages/create-wp-project/src/generators/js/flow.js";

/**
 * Build a minimal valid ctx for the js:flow feature set.
 * Mirrors the shape used in `generators.js.test.js` so the
 * variant assertions are stable across the two files.
 */
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
  const f = {
    js: "flow",
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

describe("js:flow — variant generator (Phase 25.C1)", () => {
  test("emits assets/dependencies.js starting with the // @flow pragma", () => {
    const out = flowRun(makeCtx());
    const js = out.files["assets/dependencies.js"];
    expect(js).toBeDefined();
    // The first non-empty / non-block-comment line is the Flow
    // pragma. We allow a JSDoc block before the pragma (the
    // stub template uses one), but the pragma MUST be present
    // at the top of the file.
    expect(js).toMatch(/^\s*(?:\/\*\*[\s\S]*?\*\/\s*)?\/\/\s*@flow\b/m);
  });

  test("emits a .flowconfig with the [ignore] block listing node_modules", () => {
    const out = flowRun(makeCtx());
    const fc = out.files[".flowconfig"];
    expect(fc).toBeDefined();
    expect(fc).toMatch(/\[ignore\]/);
    expect(fc).toMatch(/node_modules/);
  });

  test("descriptor has the registry shape (id, feature, variant, owns, run)", () => {
    expect(flowDescriptor.id).toBe("js:flow");
    expect(flowDescriptor.feature).toBe("js");
    expect(flowDescriptor.variant).toBe("flow");
    expect(Array.isArray(flowDescriptor.owns)).toBe(true);
    expect(flowDescriptor.owns).toContain("assets/dependencies.js");
    expect(flowDescriptor.owns).toContain(".flowconfig");
    expect(typeof flowDescriptor.run).toBe("function");
  });
});

describe("js:flow — scaffold output integration (Phase 25.C1)", () => {
  test("core generator does NOT emit tsconfig.json when js === 'flow'", () => {
    // Phase 21.13 / 21.4 core generator's tsconfig gate is
    // now `js === "typescript"` (Phase 25.B). Flow consumers
    // get a `.flowconfig` instead.
    const out = coreRun(makeCtx({}, {}, { js: "flow" }));
    expect(out.files["tsconfig.json"]).toBeUndefined();
  });

  test("package.json from the core generator includes flow-bin as a devDep", () => {
    // The Flow binary is added to the consumer's devDependencies
    // so `npm install` pulls in the Flow type-checker. The
    // version is a non-empty semver-ish string.
    const out = coreRun(makeCtx({}, {}, { js: "flow" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.devDependencies).toBeDefined();
    expect(pkg.devDependencies["flow-bin"]).toBeDefined();
    expect(pkg.devDependencies["flow-bin"]).toMatch(/^\^?\d/);
  });

  test("package.json from the core generator has a flow typecheck script (no tsc)", () => {
    // Flow replaces TypeScript's type-checker. The TS variant
    // emits `typecheck: "tsc --noEmit"`; the Flow variant must
    // emit `typecheck: "flow"` (and NOT mention tsc).
    const out = coreRun(makeCtx({}, {}, { js: "flow" }));
    const pkg = JSON.parse(out.files["package.json"]);
    const tc = pkg.scripts.typecheck;
    expect(tc).toBeDefined();
    expect(tc).toBe("flow");
    expect(tc).not.toMatch(/\btsc\b/);
  });

  test("package.json from the core generator has lint:js targeting .js only", () => {
    // The Flow variant's lint script drops the .ts,.tsx
    // extensions (Flow types are stripped at bundle time, the
    // source files are .js with the // @flow pragma).
    const out = coreRun(makeCtx({}, {}, { js: "flow" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.scripts["lint:js"]).toBeDefined();
    expect(pkg.scripts["lint:js"]).not.toMatch(/\.tsx/);
  });
});
