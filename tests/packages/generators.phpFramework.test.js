/**
 * phpFramework:wpdev scaffold contract.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { removeFeature } from "../../packages/create-wp-project/src/removeFeature.js";
import { run as phpFrameworkRun } from "../../packages/create-wp-project/src/generators/phpFramework.js";
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
    hookPrefix: "acme",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "acme_",
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
    phpFramework: "wpdev",
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

describe("phpFramework:wpdev companion scaffold", () => {
  test("emits companion plugin, bridge, register file, demo module, and docs", () => {
    const out = phpFrameworkRun(makeCtx());
    expect(out.files["companion-plugins/wpdev/wpdev.php"]).toBeDefined();
    expect(out.files["src/Support/FrameworkBridge.php"]).toBeDefined();
    expect(out.files["src/wpdev-demo-register.php"]).toBeDefined();
    expect(out.files["src/Modules/WpdevDemo/Module.php"]).toBeDefined();
    expect(out.files["docs/wpdev-integration.md"]).toBeDefined();
  });

  test("FrameworkBridge check is_framework_active is defined", () => {
    const out = phpFrameworkRun(makeCtx());
    const bridge = out.files["src/Support/FrameworkBridge.php"];
    expect(bridge).toContain("is_framework_active");
  });

  test("demo module registers admin pages via wpdev_register_module_admin_pages", () => {
    const out = phpFrameworkRun(makeCtx());
    const mod = out.files["src/Modules/WpdevDemo/Module.php"];
    expect(mod).toMatch(/wpdev_register_module_admin_pages/);
    expect(mod).not.toMatch(/extends\s+Base_Admin_Page/);
  });

  test("demo module is standalone-safe (no framework class references at load time)", () => {
    const out = phpFrameworkRun(makeCtx());
    const mod = out.files["src/Modules/WpdevDemo/Module.php"];
    expect(mod).not.toMatch(/^\s*use WPDevFramework\\/m);
    expect(mod).not.toMatch(/class\s+\w+\s+extends\s+/);
  });

  test("register file attaches demo module via WpdevModuleAdapter::attach", () => {
    const out = phpFrameworkRun(makeCtx());
    const reg = out.files["src/wpdev-demo-register.php"];
    expect(reg).toContain("WpdevModuleAdapter::attach");
  });

  test("no composerPatches suggest or require wpdev/framework-core", () => {
    const out = phpFrameworkRun(makeCtx());
    expect(
      out.composerPatches?.require?.["wpdev/framework-core"],
    ).toBeUndefined();
    expect(out.composerSuggest?.["wpdev/framework-core"]).toBeUndefined();
  });
});

async function seedProjectForFramework(tmp, features) {
  const cfg = {
    slug: "my-project",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "acme",
    npmScope: "@myorg",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "acme_",
    uiFramework: "preact",
    projectType: "plugin",
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "8.2",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  await fs.writeFile(
    path.join(tmp, "project.config.json"),
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

describe("phpFramework add/remove feature", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-framework-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("addFeature(dir, phpFramework, wpdev) is idempotent", async () => {
    const features = {
      ...defaultFeatures(),
      phpFramework: "none",
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
    };
    await seedProjectForFramework(tmp, features);

    const first = await addFeature(tmp, "phpFramework", "wpdev");
    expect(first.ok).toBe(true);
    expect(first.written).toContain("src/Support/FrameworkBridge.php");
    expect(first.written).toContain("src/wpdev-demo-register.php");

    const second = await addFeature(tmp, "phpFramework", "wpdev");
    expect(second.ok).toBe(true);
    expect(second.noop).toBe(true);
  });

  test("removeFeature(dir, phpFramework) deletes owned paths only", async () => {
    const features = {
      ...defaultFeatures(),
      phpFramework: "wpdev",
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
    };
    await seedProjectForFramework(tmp, features);

    // Seed mock files for owned files
    await fs.mkdir(path.join(tmp, "companion-plugins", "wpdev"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tmp, "src", "Support"), { recursive: true });
    await fs.mkdir(path.join(tmp, "src", "Modules", "WpdevDemo"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });

    await fs.writeFile(
      path.join(tmp, "companion-plugins", "wpdev", "wpdev.php"),
      "<?php\n",
    );
    await fs.writeFile(
      path.join(tmp, "src", "Support", "FrameworkBridge.php"),
      "<?php\n",
    );
    await fs.writeFile(
      path.join(tmp, "src", "wpdev-demo-register.php"),
      "<?php\n",
    );
    await fs.writeFile(
      path.join(tmp, "src", "Modules", "WpdevDemo", "Module.php"),
      "<?php\n",
    );
    await fs.writeFile(
      path.join(tmp, "docs", "wpdev-integration.md"),
      "Markdown\n",
    );
    await fs.writeFile(
      path.join(tmp, "src", "user-custom.php"),
      "<?php // keep\n",
    );

    const res = await removeFeature(tmp, "phpFramework");
    expect(res.ok).toBe(true);
    expect(res.removed).toContain("src/Support/FrameworkBridge.php");
    expect(res.removed).toContain("src/wpdev-demo-register.php");
    expect(res.removed).toContain("src/Modules/WpdevDemo/Module.php");

    await expect(
      fs.readFile(path.join(tmp, "src/wpdev-demo-register.php"), "utf8"),
    ).rejects.toThrow(/ENOENT/);
    await expect(
      fs.readFile(path.join(tmp, "src", "user-custom.php"), "utf8"),
    ).resolves.toBe("<?php // keep\n");
  });
});

describe("phpFramework + blocks coexistence integration", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-coexist-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("scaffoldProject with blocks:on and phpFramework:wpdev coexists cleanly", async () => {
    const answers = {
      slug: "my-project",
      npmScope: "myorg",
      globalName: "MyProject",
      localizeVar: "MyProjectLoc",
      textDomain: "my-project",
      hookPrefix: "acme",
      depsBundle: "my-project-deps.js",
      phpFunctionPrefix: "acme_",
      uiFramework: "preact",
      projectType: "plugin",
    };
    const features = {
      ...defaultFeatures(),
      blocks: "on",
      phpFramework: "wpdev",
      phpMinVersion: "8.2",
    };

    const res = await scaffoldProject(tmp, answers, { features });
    expect(res.ok).toBe(true);

    // Verify blocks files
    expect(existsSync(path.join(tmp, "blockstudio.json"))).toBe(true);
    expect(existsSync(path.join(tmp, "src/Modules/Blocks/Module.php"))).toBe(
      true,
    );

    // Verify phpFramework files
    expect(
      existsSync(path.join(tmp, "companion-plugins/wpdev/wpdev.php")),
    ).toBe(true);
    expect(existsSync(path.join(tmp, "src/Support/FrameworkBridge.php"))).toBe(
      true,
    );
    expect(existsSync(path.join(tmp, "src/wpdev-demo-register.php"))).toBe(
      true,
    );
  });
});
