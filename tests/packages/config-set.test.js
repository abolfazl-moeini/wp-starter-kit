/**
 * Phase 3 — setConfigValue() for config-only features.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { setConfigValue } from "../../packages/create-wp-project/src/config-set.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

async function seedProject(tmp, features = {}) {
  const allFeatures = { ...defaultFeatures(), ...features };
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
    phpMinVersion: allFeatures.phpMinVersion || "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
    features: { ...allFeatures },
  };
  await fs.writeFile(
    path.join(tmp, "wpdev.json"),
    JSON.stringify(cfg, null, 2) + "\n",
    "utf8",
  );
  const manifest = buildManifest({
    kitVersion: "0.1.0",
    features: allFeatures,
    generatedAt: "2026-06-15T00:00:00.000Z",
    slug: cfg.slug,
    globalName: cfg.globalName,
    localizeVar: cfg.localizeVar,
    textDomain: cfg.textDomain,
    hookPrefix: cfg.hookPrefix,
    npmScope: cfg.npmScope,
    depsBundle: cfg.depsBundle,
    phpFunctionPrefix: cfg.phpFunctionPrefix,
    uiFramework: cfg.uiFramework,
    restNamespace: cfg.restNamespace,
    vendorPrefix: cfg.vendorPrefix,
    phpMinVersion: cfg.phpMinVersion,
    phpSourceVersion: cfg.phpSourceVersion,
    batchEndpoint: cfg.batchEndpoint,
    projectType: cfg.projectType,
  });
  await writeManifest(tmp, manifest);
  return { cfg, features: allFeatures };
}

describe("setConfigValue()", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-config-set-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test('setConfigValue(dir,"phpMinVersion","8.2") syncs top-level, composer, header, docker', async () => {
    await seedProject(tmpDir, { phpMinVersion: "7.4" });
    await fs.writeFile(
      path.join(tmpDir, "composer.json"),
      JSON.stringify(
        {
          name: "acme/my-project",
          require: { php: ">=7.4" },
          config: { platform: { php: "7.4" } },
        },
        null,
        2,
      ) + "\n",
    );
    await fs.writeFile(
      path.join(tmpDir, "my-project.php"),
      "<?php\n/**\n * Requires PHP:      7.4\n */\ndefine( 'MY_PROJECT_PHP_MIN', '7.4' );\n",
    );
    await fs.writeFile(path.join(tmpDir, "readme.txt"), "Requires PHP: 7.4\n");
    await fs.mkdir(path.join(tmpDir, "tests/docker-phpunit"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmpDir, "tests/docker-phpunit/docker-compose.yml"),
      "image: ${PHP_IMAGE:-wordpress:php8.1-apache}\n",
    );

    const result = await setConfigValue(tmpDir, "phpMinVersion", "8.2");
    expect(result.ok).toBe(true);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.phpMinVersion).toBe("8.2");
    expect(manifest.phpMinVersion).toBe("8.2");
    // Source bumped because it was below min.
    expect(manifest.phpSourceVersion).toBe("8.2");

    const composer = JSON.parse(
      await fs.readFile(path.join(tmpDir, "composer.json"), "utf8"),
    );
    expect(composer.require.php).toBe(">=8.2");
    expect(composer.config.platform.php).toBe("8.2");

    const plugin = await fs.readFile(
      path.join(tmpDir, "my-project.php"),
      "utf8",
    );
    expect(plugin).toMatch(/Requires PHP:\s+8\.2/);
    expect(plugin).toMatch(/PHP_MIN',\s*'8\.2'/);

    const readme = await fs.readFile(path.join(tmpDir, "readme.txt"), "utf8");
    expect(readme).toMatch(/Requires PHP:\s*8\.2/);

    const compose = await fs.readFile(
      path.join(tmpDir, "tests/docker-phpunit/docker-compose.yml"),
      "utf8",
    );
    expect(compose).toContain("wordpress:php8.2-apache");
  });

  test('setConfigValue(dir,"phpMinVersion","7.4") keeps higher phpSourceVersion', async () => {
    await seedProject(tmpDir, { phpMinVersion: "8.1" });
    // seed uses phpSourceVersion 8.1; lowering min should keep source.
    const result = await setConfigValue(tmpDir, "phpMinVersion", "7.4");
    expect(result.ok).toBe(true);
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.phpMinVersion).toBe("7.4");
    expect(manifest.phpMinVersion).toBe("7.4");
    expect(manifest.phpSourceVersion).toBe("8.1");
  });

  test('setConfigValue(dir,"phpMinVersion","7.4") keeps faultTolerance on (dual-mode package)', async () => {
    await seedProject(tmpDir, {
      phpMinVersion: "8.1",
      faultTolerance: "on",
    });
    const result = await setConfigValue(tmpDir, "phpMinVersion", "7.4");
    expect(result.ok).toBe(true);
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.phpMinVersion).toBe("7.4");
    // Dual-mode FT no longer requires phpMinVersion ≥ 8.1.
    expect(manifest.features.faultTolerance).toBe("on");
  });

  test('setConfigValue(dir,"js","typescript") is rejected (use add/remove)', async () => {
    await seedProject(tmpDir);
    const result = await setConfigValue(tmpDir, "js", "typescript");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/add|remove/i);
  });

  test('setConfigValue(dir,"license","mit") regenerates LICENSE', async () => {
    await seedProject(tmpDir, { license: "gpl2" });
    await fs.writeFile(
      path.join(tmpDir, "LICENSE"),
      "old license content",
      "utf8",
    );
    const result = await setConfigValue(tmpDir, "license", "mit");
    expect(result.ok).toBe(true);
    const license = await fs.readFile(path.join(tmpDir, "LICENSE"), "utf8");
    expect(license).toMatch(/MIT License/i);
    expect(license).not.toMatch(/old license content/);
  });

  test('setConfigValue(dir,"ci","off") updates manifest', async () => {
    await seedProject(tmpDir, { ci: "auto" });
    const result = await setConfigValue(tmpDir, "ci", "off");
    expect(result.ok).toBe(true);
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.ci).toBe("off");
  });
});
