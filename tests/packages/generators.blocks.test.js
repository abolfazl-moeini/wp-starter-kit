/**
 * Blockstudio blocks:on scaffold contract.
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
    slug_underscore: "my_project",
  };
  const f = {
    ...defaultFeatures(),
    blocks: "on",
    js: "none",
    wpMinVersion: "6.0",
    ...features,
  };
  return {
    answers,
    cfg,
    features: f,
    vars: { ...answers, ...cfg, vendor: "WPDev", frameworkNamespace: "WPDev" },
  };
}

describe("blocks:on Blockstudio scaffold", () => {
  test("emits blockstudio.json, example block, bridge module, register bootstrap", () => {
    const out = blocksRun(makeCtx());
    expect(out.files["blockstudio.json"]).toBeDefined();
    expect(out.files["blockstudio/example-hero/block.json"]).toBeDefined();
    expect(out.files["blockstudio/example-hero/index.php"]).toBeDefined();
    expect(out.files["src/Modules/Blocks/Module.php"]).toBeDefined();
    expect(out.files["src/blocks-register.php"]).toBeDefined();
  });

  test("works with js:none (PHP-first)", () => {
    const out = blocksRun(makeCtx({ js: "none" }));
    expect(out.files["blockstudio.json"]).toBeDefined();
  });

  test("Module.php uses Blockstudio Build API", () => {
    const out = blocksRun(makeCtx());
    const php = out.files["src/Modules/Blocks/Module.php"];
    expect(php).toMatch(/Blockstudio\\Build::init/);
    expect(php).toMatch(/blockstudio\/settings\/path/);
    expect(php).not.toMatch(/blockstudio_load/);
    expect(php).not.toMatch(/register_block_type/);
  });

  test("composerPatches require blockstudio", () => {
    const out = blocksRun(makeCtx());
    expect(out.composerPatches.require["blockstudio/blockstudio"]).toBe("^7.3");
  });

  test("example block uses apiVersion 3 and object-format blockstudio.attributes", () => {
    const out = blocksRun(makeCtx());
    const parsed = JSON.parse(out.files["blockstudio/example-hero/block.json"]);
    expect(parsed.apiVersion).toBe(3);
    expect(typeof parsed.blockstudio.attributes).toBe("object");
    expect(Array.isArray(parsed.blockstudio.attributes)).toBe(false);
  });

  test("blockstudio.json uses v7 schema", () => {
    const out = blocksRun(makeCtx());
    const parsed = JSON.parse(out.files["blockstudio.json"]);
    expect(parsed.$schema).toBe(
      "https://app.blockstudio.dev/schema/blockstudio",
    );
  });

  test("core package.json does not add @wordpress/blocks when blocks:on", () => {
    const ctx = makeCtx({ js: "typescript" });
    const out = coreRun(ctx);
    expect(out.files["package.json"]).toBeDefined();
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.devDependencies?.["@wordpress/blocks"]).toBeUndefined();
    expect(pkg.devDependencies?.["@wordpress/block-editor"]).toBeUndefined();
  });
});
