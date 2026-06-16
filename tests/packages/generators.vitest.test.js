/**
 * Phase 25.D — jsTest:vitest generator.
 */

import { describe, test, expect } from "@jest/globals";

import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import { run as jsTestRun } from "../../packages/create-wp-project/src/generators/jsTest.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

function makeCtx(features = {}) {
  const answers = {
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
  };
  const cfg = {
    slug: answers.slug,
    globalName: answers.globalName,
    localizeVar: answers.localizeVar,
    textDomain: answers.textDomain,
    hookPrefix: answers.hookPrefix,
    npmScope: "@myorg",
    depsBundle: answers.depsBundle,
    phpFunctionPrefix: answers.phpFunctionPrefix,
    uiFramework: answers.uiFramework,
    projectType: answers.projectType,
    restNamespace: "wpsk/v1",
    vendorPrefix: "WpskVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  const f = { ...defaultFeatures(), jsTest: "vitest", ...features };
  return { answers, cfg, features: f };
}

describe("jsTest:vitest generator (Phase 25.D)", () => {
  test("emits vitest.config.ts when js=typescript", () => {
    const out = jsTestRun(makeCtx({ js: "typescript", jsTest: "vitest" }));
    expect(out.files["vitest.config.ts"]).toBeDefined();
    expect(out.files["jest.config.mjs"]).toBeUndefined();
    expect(out.devDeps.vitest).toBeDefined();
  });

  test("emits vitest.config.js when js=pure", () => {
    const out = jsTestRun(makeCtx({ js: "pure", jsTest: "vitest" }));
    expect(out.files["vitest.config.js"]).toBeDefined();
    expect(out.files["vitest.config.ts"]).toBeUndefined();
  });

  test("package.json uses vitest run script and includes vitest devDep", () => {
    const out = coreRun(makeCtx({ js: "typescript", jsTest: "vitest" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.scripts.test).toBe("vitest run");
    expect(pkg.devDependencies.vitest).toBeDefined();
    expect(pkg.devDependencies.jest).toBeUndefined();
  });
});
