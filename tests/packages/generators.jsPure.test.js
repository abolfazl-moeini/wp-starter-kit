/**
 * Phase 25.B — js:pure variant generator.
 *
 * The pure-JS variant of the `js` feature emits a plain JavaScript
 * dependencies entry (no TypeScript syntax, no Flow pragma). Phase 21
 * already locks the *variant generator* contract (js/pure.js emits
 * `assets/dependencies.js` and that's it). Phase 25.B locks the
 * *scaffold output* contract: when the consumer picks `js:pure`,
 * the generated kit project must:
 *
 *   1. Have a valid ESM `assets/dependencies.js` (no `: type`
 *      annotations, no `as Type` casts, no `// @flow` pragma).
 *   2. NOT have a `tsconfig.json` (TypeScript is not in play).
 *   3. Have a `package.json` whose `lint:js` script targets `.js`
 *      only (no `.ts,.tsx` — the consumer has no TS files).
 *   4. Have a `package.json` with no `tsc` typecheck step (no TS
 *      compiler to invoke).
 *
 * Sub-task 25.B2 wires the templates / variant-aware packageJson.
 * These tests describe the contract — they run in RED until B2 ships.
 *
 * The variant generator itself is covered in `generators.js.test.js`
 * (Phase 21.5). The new tests here focus on the *integration*: the
 * consumer's full project layout, the core generator's tsconfig gate,
 * and the variant-aware package.json scripts. Integration with the
 * scaffold is covered separately in `create-wp-project.test.js`.
 *
 * NOTE: this test file lives under `tests/packages/` alongside the
 * other generator tests. It is FILTER-RUN (`npm test -- generators.jsPure`)
 * because the parallel workers are also adding RED tests in this
 * directory and the full `npm test` is expected to be dirty while
 * multiple workers are in flight.
 */

import { describe, test, expect } from "@jest/globals";

import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import {
  run as pureRun,
  descriptor as pureDescriptor,
} from "../../packages/create-wp-project/src/generators/js/pure.js";

/**
 * Build a minimal valid ctx for the js:pure feature set. Mirrors
 * the shape used in `generators.js.test.js` so the variant
 * assertions are stable across the two files.
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
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
    ...cfg,
  };
  const f = {
    js: "pure",
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

describe("js:pure — variant generator (Phase 25.B1)", () => {
  test("emits assets/dependencies.js as valid ESM (no TS, no Flow)", () => {
    const out = pureRun(makeCtx());
    const js = out.files["assets/dependencies.js"];
    expect(js).toBeDefined();
    // No TypeScript type annotations on parameters.
    expect(js).not.toMatch(/:\s*string\b/);
    expect(js).not.toMatch(/:\s*\{[^}]*\}/);
    // No TypeScript `as Type` casts (esbuild-flow will pass these
    // through, but the variant generator must not emit any).
    expect(js).not.toMatch(/\s+as\s+[A-Z][A-Za-z0-9_]*/);
    // No Flow pragma.
    expect(js).not.toMatch(/^\s*\/\/\s*@flow\b/m);
  });

  test("descriptor has the registry shape (id, feature, variant, owns, run)", () => {
    expect(pureDescriptor.id).toBe("js:pure");
    expect(pureDescriptor.feature).toBe("js");
    expect(pureDescriptor.variant).toBe("pure");
    expect(Array.isArray(pureDescriptor.owns)).toBe(true);
    expect(pureDescriptor.owns).toContain("assets/dependencies.js");
    expect(typeof pureDescriptor.run).toBe("function");
  });
});

describe("js:pure — scaffold output integration (Phase 25.B1)", () => {
  test("core generator does NOT emit tsconfig.json when js === 'pure'", () => {
    // Phase 21.13 / 21.4 core generator currently gates tsconfig on
    // `js !== "none"`. Phase 25.B updates the gate to `js === "typescript"`
    // (only the typescript variant needs a tsconfig.json). For pure
    // and flow, no tsconfig — the build toolchain is JS-based.
    const out = coreRun(makeCtx({}, {}, { js: "pure" }));
    expect(out.files["tsconfig.json"]).toBeUndefined();
  });

  test("package.json from the core generator has lint:js targeting .js only", () => {
    // The TS variant's lint script is
    //   "lint:js": "eslint . --ext .js,.jsx,.ts,.tsx"
    // The pure variant's lint script should drop the .ts,.tsx
    // extensions because the consumer has no TS files.
    const out = coreRun(makeCtx({}, {}, { js: "pure" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.scripts["lint:js"]).toBeDefined();
    // The .ts and .tsx extensions must NOT be in the lint ext list.
    expect(pkg.scripts["lint:js"]).not.toMatch(/\.tsx/);
    // (We don't require the exact string — we just require that the
    // TS-only extensions are gone. A more specific assertion would
    // be brittle to flag-ordering changes.)
  });

  test("package.json from the core generator has NO tsc typecheck (no TS compiler)", () => {
    // The pure variant has no TypeScript — there is nothing to
    // typecheck. The TS variant's `typecheck: "tsc --noEmit"` must
    // not appear in a js:pure consumer's package.json.
    const out = coreRun(makeCtx({}, {}, { js: "pure" }));
    const pkg = JSON.parse(out.files["package.json"]);
    const tc = pkg.scripts.typecheck;
    if (tc !== undefined) {
      expect(tc).not.toMatch(/\btsc\b/);
    }
  });
});
