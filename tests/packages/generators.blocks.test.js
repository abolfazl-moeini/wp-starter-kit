/**
 * Phase 25.F — blocks:on scaffold contract.
 */

import { describe, test, expect } from "@jest/globals";

import { run as blocksRun } from "../../packages/create-wp-project/src/generators/blocks.js";
import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
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
  const f = {
    ...defaultFeatures(),
    blocks: "on",
    js: "typescript",
    wpMinVersion: "6.0",
    ...features,
  };
  return {
    answers,
    cfg,
    features: f,
    vars: { ...answers, ...cfg, vendor: "WPSK" },
  };
}

describe("blocks:on scaffold (Phase 25.F)", () => {
  test("emits block module with block.json, index.ts, Module.php", () => {
    const out = blocksRun(makeCtx());
    expect(out.files["src/Modules/Blocks/block.json"]).toBeDefined();
    expect(out.files["src/Modules/Blocks/index.ts"]).toBeDefined();
    expect(out.files["src/Modules/Blocks/Module.php"]).toBeDefined();
  });

  test("Module.php registers the block via register_block_type_from_metadata", () => {
    const out = blocksRun(makeCtx());
    expect(out.files["src/Modules/Blocks/Module.php"]).toMatch(
      /register_block_type_from_metadata/,
    );
  });

  test("package.json includes @wordpress/block-editor when blocks:on", () => {
    const out = coreRun(makeCtx());
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.devDependencies["@wordpress/block-editor"]).toBeDefined();
    expect(pkg.devDependencies["@wordpress/blocks"]).toBeDefined();
  });
});
