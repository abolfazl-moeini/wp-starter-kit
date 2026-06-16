/**
 * Phase 26.3 — consumer .gitignore generator contract.
 */

import { describe, test, expect } from "@jest/globals";

import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

function makeCtx() {
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
  return {
    answers,
    cfg,
    features: defaultFeatures(),
    vars: {
      ...answers,
      ...cfg,
      wpMinVersion: "6.0",
      phpMinVersion: "7.4",
    },
  };
}

describe("generators.gitignore (Phase 26.3)", () => {
  test("emits .gitignore with node_modules, vendor, dist, and build", () => {
    const out = coreRun(makeCtx());
    const gi = out.files[".gitignore"];
    expect(gi).toBeDefined();
    expect(gi).toMatch(/node_modules\//);
    expect(gi).toMatch(/vendor\//);
    expect(gi).toMatch(/dist\//);
    expect(gi).toMatch(/build\//);
  });
});
