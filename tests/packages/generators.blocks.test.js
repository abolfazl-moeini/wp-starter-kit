/**
 * Blockstudio blocks:on scaffold contract.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { removeFeature } from "../../packages/create-wp-project/src/removeFeature.js";
import { run as blocksRun } from "../../packages/create-wp-project/src/generators/blocks.js";
import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

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

  test("replaces legacy src/Modules/Blocks/index.ts with Blockstudio pointer", () => {
    const out = blocksRun(makeCtx());
    expect(out.files["src/Modules/Blocks/index.ts"]).toMatch(/Blockstudio/);
    expect(out.files["src/Modules/Blocks/index.ts"]).not.toMatch(
      /registerBlockType/,
    );
  });
});

async function seedProjectForBlocks(tmp, features) {
  const cfg = {
    slug: "my-project",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    npmScope: "@myorg",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
    projectType: "plugin",
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "8.2",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  await fs.writeFile(
    path.join(tmp, "wpdev.json"),
    JSON.stringify({ ...cfg, features: { ...features } }, null, 2) + "\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(tmp, "composer.json"),
    JSON.stringify({ name: "my-project/plugin", require: {} }, null, 2) + "\n",
    "utf8",
  );
  const manifest = buildManifest({
    kitVersion: "0.1.0",
    features,
    generatedAt: "2026-06-15T00:00:00.000Z",
  });
  await writeManifest(tmp, manifest);
}

async function seedBlocksOn(tmp) {
  await fs.mkdir(path.join(tmp, "blockstudio", "example-hero"), {
    recursive: true,
  });
  await fs.mkdir(path.join(tmp, "src", "Modules", "Blocks"), {
    recursive: true,
  });
  await fs.writeFile(path.join(tmp, "blockstudio.json"), "{}\n", "utf8");
  await fs.writeFile(
    path.join(tmp, "blockstudio", "example-hero", "block.json"),
    "{}\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(tmp, "src", "Modules", "Blocks", "Module.php"),
    "<?php // blocks\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(tmp, "src", "blocks-register.php"),
    "<?php // register\n",
    "utf8",
  );
}

describe("blocks add/remove feature", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-blocks-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("addFeature(dir, blocks, on) is idempotent and patches composer.json", async () => {
    const features = {
      ...defaultFeatures(),
      blocks: "off",
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
    };
    await seedProjectForBlocks(tmp, features);

    const first = await addFeature(tmp, "blocks", "on");
    expect(first.ok).toBe(true);
    expect(first.written).toContain("blockstudio.json");
    expect(first.written).toContain("src/Modules/Blocks/Module.php");

    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.require["blockstudio/blockstudio"]).toBe("^7.3");

    const second = await addFeature(tmp, "blocks", "on");
    expect(second.ok).toBe(true);
    expect(second.noop).toBe(true);
  });

  test("removeFeature(dir, blocks) deletes owned paths only", async () => {
    const features = {
      ...defaultFeatures(),
      blocks: "on",
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
    };
    await seedProjectForBlocks(tmp, features);
    await seedBlocksOn(tmp);
    await fs.writeFile(
      path.join(tmp, "src", "user-custom.php"),
      "<?php // keep\n",
      "utf8",
    );

    const res = await removeFeature(tmp, "blocks");
    expect(res.ok).toBe(true);
    expect(res.removed).toContain("blockstudio.json");
    expect(res.removed).toContain("src/Modules/Blocks/Module.php");
    expect(res.removed).toContain("src/blocks-register.php");

    await expect(
      fs.readFile(path.join(tmp, "blockstudio.json"), "utf8"),
    ).rejects.toThrow(/ENOENT/);
    await expect(
      fs.readFile(path.join(tmp, "src", "user-custom.php"), "utf8"),
    ).resolves.toBe("<?php // keep\n");

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.blocks).toBe("off");
  });
});
