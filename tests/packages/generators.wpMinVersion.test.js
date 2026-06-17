/**
 * Phase 25.I — wpMinVersion integration.
 */

import { describe, test, expect } from "@jest/globals";

import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import { validateFeatureSet } from "../../packages/create-wp-project/src/features.js";
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
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  const f = { ...defaultFeatures(), ...features };
  return { answers, cfg, features: f };
}

describe("wpMinVersion — plugin header + readme (Phase 25.I)", () => {
  test("writes Requires at least into {slug}.php from features.wpMinVersion", () => {
    const out = coreRun(makeCtx({ wpMinVersion: "5.8" }));
    const php = out.files["my-project.php"];
    expect(php).toMatch(/Requires at least:\s*5\.8/);
  });

  test("writes Requires at least into readme.txt from features.wpMinVersion", () => {
    const out = coreRun(makeCtx({ wpMinVersion: "6.2" }));
    const readme = out.files["readme.txt"];
    expect(readme).toMatch(/Requires at least:\s*6\.2/);
  });

  test("writes Requires PHP from features.phpMinVersion", () => {
    const out = coreRun(makeCtx({ phpMinVersion: "8.1", wpMinVersion: "6.0" }));
    const php = out.files["my-project.php"];
    expect(php).toMatch(/Requires PHP:\s*8\.1/);
  });
});

describe("wpMinVersion — blocks advisory (Blockstudio)", () => {
  test("blocks:on + wpMinVersion:5.6 is rejected (unknown catalog variant)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      blocks: "on",
      js: "typescript",
      wpMinVersion: "5.6",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.wpMinVersion).toBeDefined();
  });

  test("blocks:on + wpMinVersion:6.0 warns but remains valid", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      blocks: "on",
      js: "none",
      jsTest: "none",
      wpMinVersion: "6.0",
      phpMinVersion: "8.2",
    });
    expect(r.ok).toBe(true);
    expect(r.warnings.blocks).toMatch(/6\.7/);
  });
});
