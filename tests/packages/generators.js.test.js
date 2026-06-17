/**
 * Phase 21.5 / 21.6 — js:variant generators.
 *
 * The `js` feature has four variants. Three of them are real
 * (typescript, pure, flow) and one is a no-op (none — the
 * registry filter drops it). For each real variant, a small
 * generator emits the JS entry file(s) + (for flow) the
 * `.flowconfig` and the devDeps entry. The full per-variant
 * templates ship in Phase 25; here we lock the contract.
 *
 * Contracts:
 *  1. js:typescript → assets/dependencies.ts (a .ts file with
 *     type annotations). core also emits tsconfig.json (per
 *     the js-gate in the core tests).
 *  2. js:pure → assets/dependencies.js (no .ts, no .flow
 *     pragma). The file is plain JavaScript — no `as` casts,
 *     no `: type` annotations, no `// @flow` pragma.
 *  3. js:flow → assets/dependencies.js (with `// @flow` pragma)
 *     + .flowconfig. The generator reports `flow-bin` as a
 *     devDep (the scaffold's package.json merge picks it up
 *     in Phase 22; Phase 21 documents the contribution but
 *     does not act on it).
 *  4. js:none → the registry does not pick any js generator;
 *     there is no separate `js:none` generator descriptor.
 *
 * In addition, the registry guarantees that only the matching
 * variant's generator runs for a given feature set (covered
 * by generators.registry.test.js; the variant tests here
 * confirm the generator's own run() output, not the gate).
 */

import { describe, test, expect } from "@jest/globals";

import {
  run as tsRun,
  descriptor as tsDescriptor,
} from "../../packages/create-wp-project/src/generators/js/typescript.js";
import {
  run as pureRun,
  descriptor as pureDescriptor,
} from "../../packages/create-wp-project/src/generators/js/pure.js";
import {
  run as flowRun,
  descriptor as flowDescriptor,
} from "../../packages/create-wp-project/src/generators/js/flow.js";

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

describe("js:typescript — variant generator (Phase 21.5)", () => {
  test("emits assets/dependencies.ts as a TypeScript file (with type annotations)", () => {
    const out = tsRun(makeCtx());
    expect(out.files["assets/dependencies.ts"]).toBeDefined();
    const ts = out.files["assets/dependencies.ts"];
    // TypeScript signatures — at least one `as Type` cast or `: type` annotation.
    // The TEMPLATE_DEPENDENCIES_TS uses `(window as Window & { Tabulator?: unknown })`
    // and `(_endpoint: string, options: { disableLoading?: boolean } = {})`.
    expect(ts).toMatch(/\bas\s+Window\b/);
    expect(ts).toMatch(/:\s*string/);
    expect(ts).toMatch(/:\s*\{/);
  });

  test("does NOT emit a .js file (the TS generator owns .ts only)", () => {
    const out = tsRun(makeCtx());
    expect(out.files["assets/dependencies.js"]).toBeUndefined();
    expect(out.files[".flowconfig"]).toBeUndefined();
  });

  test("substitutes globalName + hookPrefix tokens", () => {
    const out = tsRun(makeCtx());
    const ts = out.files["assets/dependencies.ts"];
    expect(ts).toContain("MyProject");
    expect(ts).toMatch(/my-project-/);
  });

  test("descriptor has the registry shape", () => {
    expect(tsDescriptor.id).toBe("js:typescript");
    expect(tsDescriptor.feature).toBe("js");
    expect(tsDescriptor.variant).toBe("typescript");
    expect(Array.isArray(tsDescriptor.owns)).toBe(true);
    expect(tsDescriptor.owns).toContain("assets/dependencies.ts");
    expect(typeof tsDescriptor.run).toBe("function");
  });
});

describe("js:pure — variant generator (Phase 21.5)", () => {
  test("emits assets/dependencies.js (no .ts, no .flow pragma)", () => {
    const out = pureRun(makeCtx());
    expect(out.files["assets/dependencies.js"]).toBeDefined();
    expect(out.files["assets/dependencies.ts"]).toBeUndefined();
    expect(out.files[".flowconfig"]).toBeUndefined();
    const js = out.files["assets/dependencies.js"];
    // Plain JavaScript — no TypeScript type annotations.
    expect(js).not.toMatch(/:\s*Window\s*&/);
    expect(js).not.toMatch(/\s+as\s+Window/);
    // No Flow pragma.
    expect(js).not.toMatch(/^\s*\/\/\s*@flow\b/m);
  });

  test("substitutes globalName + hookPrefix tokens", () => {
    const out = pureRun(makeCtx());
    const js = out.files["assets/dependencies.js"];
    expect(js).toContain("MyProject");
    expect(js).toMatch(/my-project-/);
  });

  test("descriptor has the registry shape", () => {
    expect(pureDescriptor.id).toBe("js:pure");
    expect(pureDescriptor.feature).toBe("js");
    expect(pureDescriptor.variant).toBe("pure");
    expect(pureDescriptor.owns).toContain("assets/dependencies.js");
  });
});

describe("js:flow — variant generator (Phase 21.5/21.6)", () => {
  test("emits assets/dependencies.js with the // @flow pragma", () => {
    const out = flowRun(makeCtx());
    expect(out.files["assets/dependencies.js"]).toBeDefined();
    const js = out.files["assets/dependencies.js"];
    // Flow pragma at the top of the file.
    expect(js).toMatch(/^\s*\/\/\s*@flow\b/m);
  });

  test("emits .flowconfig (the Flow checker config)", () => {
    const out = flowRun(makeCtx());
    expect(out.files[".flowconfig"]).toBeDefined();
    const fc = out.files[".flowconfig"];
    // [ignore] block + at least the node_modules entry.
    expect(fc).toMatch(/\[ignore\]/);
    expect(fc).toMatch(/node_modules/);
  });

  test("does NOT emit a .ts file", () => {
    const out = flowRun(makeCtx());
    expect(out.files["assets/dependencies.ts"]).toBeUndefined();
  });

  test("reports flow-bin as a devDep (so the scaffold's package.json merge can pick it up later)", () => {
    const out = flowRun(makeCtx());
    expect(out.devDeps).toBeDefined();
    expect(out.devDeps["flow-bin"]).toBeDefined();
    // The version is a non-empty semver-ish string.
    expect(out.devDeps["flow-bin"]).toMatch(/^\^?\d/);
  });

  test("descriptor has the registry shape", () => {
    expect(flowDescriptor.id).toBe("js:flow");
    expect(flowDescriptor.feature).toBe("js");
    expect(flowDescriptor.variant).toBe("flow");
    expect(flowDescriptor.owns).toContain("assets/dependencies.js");
    expect(flowDescriptor.owns).toContain(".flowconfig");
  });
});

describe("js variant isolation — no cross-leak (Phase 21.5)", () => {
  test("typescript generator does not emit any .js file or .flowconfig", () => {
    const out = tsRun(makeCtx());
    for (const f of Object.keys(out.files)) {
      expect(f).not.toMatch(/\.js$/);
      expect(f).not.toBe(".flowconfig");
    }
  });

  test("pure generator does not emit a .ts file or .flowconfig", () => {
    const out = pureRun(makeCtx());
    for (const f of Object.keys(out.files)) {
      expect(f).not.toMatch(/\.ts$/);
      expect(f).not.toBe(".flowconfig");
    }
  });

  test("flow generator does not emit a .ts file", () => {
    const out = flowRun(makeCtx());
    for (const f of Object.keys(out.files)) {
      expect(f).not.toMatch(/\.ts$/);
    }
  });
});
