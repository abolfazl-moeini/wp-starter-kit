/**
 * phpFramework:wpdev scaffold contract.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { removeFeature } from "../../packages/create-wp-project/src/removeFeature.js";
import { run as phpFrameworkRun } from "../../packages/create-wp-project/src/generators/phpFramework.js";
import { run as coreRun } from "../../packages/create-wp-project/src/generators/core.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

function makeCtx(features = {}) {
  const answers = {
    slug: "my-project",
    name: "My Project",
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
    vars: {
      ...answers,
      ...cfg,
      vendor: "WPDev",
      frameworkNamespace: "WPDev",
      slug_underscore: "my_project",
    },
  };
}

describe("phpFramework:wpdev soft-dependency scaffold", () => {
  test("emits bridge, register, demo module, docs — not companion-plugins", () => {
    const out = phpFrameworkRun(makeCtx());
    expect(out.files["companion-plugins/wpdev/wpdev.php"]).toBeUndefined();
    expect(
      out.files["companion-plugins/wpdev/.wpdev-core-install"],
    ).toBeUndefined();
    expect(out.dirs || []).not.toContain("companion-plugins");
    expect(out.postScaffold?.installWpdevCore).toBeUndefined();
    expect(out.files["src/Support/FrameworkBridge.php"]).toBeDefined();
    expect(out.files["src/wpdev-demo-register.php"]).toBeDefined();
    expect(out.files["src/Modules/WpdevDemo/Module.php"]).toBeDefined();
    expect(out.files["docs/wpdev-integration.md"]).toMatch(
      /Soft-dep|does\s+\*\*not\*\* create|not\*\* create a `companion-plugins/i,
    );
    expect(out.files["docs/wpdev-integration.md"]).not.toMatch(
      /git submodule add.*companion-plugins/,
    );
  });

  test("descriptor does not own companion-plugins", () => {
    // re-import descriptor via run module side effects
    return import("../../packages/create-wp-project/src/generators/phpFramework.js").then(
      ({ descriptor }) => {
        expect(
          descriptor.owns.some((p) => p.includes("companion-plugins")),
        ).toBe(false);
      },
    );
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

  test("core main plugin file includes admin notice when framework inactive", () => {
    const out = coreRun(makeCtx());
    const main = out.files["my-project.php"];
    expect(main).toBeDefined();
    expect(main).toMatch(/_wpdev_dependency_notice/);
    expect(main).toMatch(/wpdev_register_table/);
    expect(main).toMatch(/admin_notices/);
    expect(main).toMatch(/Requires Plugins:\s*wpdev/);
  });

  test("core main plugin file omits notice when phpFramework is none", () => {
    const out = coreRun(makeCtx({ phpFramework: "none" }));
    const main = out.files["my-project.php"];
    expect(main).toBeDefined();
    expect(main).not.toMatch(/_wpdev_dependency_notice/);
    expect(main).not.toMatch(/Requires Plugins:\s*wpdev/);
  });

  test("ensureRequiresPluginsWpdevHeader injects after Domain Path", async () => {
    const {
      ensureRequiresPluginsWpdevHeader,
      stripRequiresPluginsWpdevHeader,
      ensureWpdevDependencyNotice,
      stripWpdevDependencyNotice,
    } =
      await import("../../packages/create-wp-project/src/generators/phpFramework.js");
    const before = `<?php
/**
 * Plugin Name: Demo
 * Text Domain: demo
 * Domain Path:       /languages
 *
 * @package demo
 */
`;
    const { content, changed } = ensureRequiresPluginsWpdevHeader(before);
    expect(changed).toBe(true);
    expect(content).toMatch(/Domain Path:[^\n]*\n \* Requires Plugins: wpdev/);
    const again = ensureRequiresPluginsWpdevHeader(content);
    expect(again.changed).toBe(false);
    const stripped = stripRequiresPluginsWpdevHeader(content);
    expect(stripped.changed).toBe(true);
    expect(stripped.content).not.toMatch(/Requires Plugins:/);

    const withNotice = ensureWpdevDependencyNotice(before, {
      slug_underscore: "demo",
      textDomain: "demo",
      name: "Demo",
    });
    expect(withNotice.changed).toBe(true);
    expect(withNotice.content).toMatch(/_wpdev_dependency_notice/);
    const noticeAgain = ensureWpdevDependencyNotice(withNotice.content, {
      slug_underscore: "demo",
    });
    expect(noticeAgain.changed).toBe(false);
    const strippedNotice = stripWpdevDependencyNotice(withNotice.content);
    expect(strippedNotice.changed).toBe(true);
    expect(strippedNotice.content).not.toMatch(/_wpdev_dependency_notice/);
  });
});

async function seedProjectForFramework(tmp, features) {
  const branding = {
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
    path.join(tmp, "composer.json"),
    JSON.stringify({ name: "my-project/plugin", require: {} }, null, 2) + "\n",
    "utf8",
  );
  const manifest = buildManifest({
    kitVersion: "0.1.0",
    features,
    generatedAt: "2026-06-15T00:00:00.000Z",
    ...branding,
    build: {
      assetMappings: [],
      globalMappings: {},
      styleEntryPoints: ["assets/stylesheets/style.css"],
    },
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

  test("addFeature(dir, phpFramework, wpdev) injects header + notice, no companion-plugins", async () => {
    const features = {
      ...defaultFeatures(),
      phpFramework: "none",
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
    };
    await seedProjectForFramework(tmp, features);
    await fs.writeFile(
      path.join(tmp, "my-project.php"),
      `<?php
/**
 * Plugin Name: My Project
 * Text Domain: my-project
 * Domain Path:       /languages
 *
 * @package my-project
 */
`,
      "utf8",
    );

    const first = await addFeature(tmp, "phpFramework", "wpdev");
    expect(first.ok).toBe(true);
    expect(first.written).toContain("src/Support/FrameworkBridge.php");
    expect(first.written).toContain("src/wpdev-demo-register.php");
    expect(first.written.some((p) => p.includes("companion-plugins"))).toBe(
      false,
    );
    expect(existsSync(path.join(tmp, "companion-plugins"))).toBe(false);
    const pluginPhp = await fs.readFile(
      path.join(tmp, "my-project.php"),
      "utf8",
    );
    expect(pluginPhp).toMatch(/Requires Plugins:\s*wpdev/);
    expect(pluginPhp).toMatch(/_wpdev_dependency_notice/);
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

    await fs.mkdir(path.join(tmp, "src", "Support"), { recursive: true });
    await fs.mkdir(path.join(tmp, "src", "Modules", "WpdevDemo"), {
      recursive: true,
    });
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });

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
    await fs.writeFile(
      path.join(tmp, "my-project.php"),
      `<?php
/**
 * Plugin Name: My Project
 * Text Domain: my-project
 * Domain Path:       /languages
 * Requires Plugins: wpdev
 *
 * @package my-project
 */

/* BEGIN wpdev-dependency-notice */
add_action( 'admin_notices', 'my_project_wpdev_dependency_notice' );
function my_project_wpdev_dependency_notice() {}
/* END wpdev-dependency-notice */
`,
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

    const pluginPhp = await fs.readFile(
      path.join(tmp, "my-project.php"),
      "utf8",
    );
    expect(pluginPhp).not.toMatch(/Requires Plugins:\s*wpdev/);
    expect(pluginPhp).not.toMatch(/_wpdev_dependency_notice/);
  });
});
