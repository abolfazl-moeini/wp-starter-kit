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

  test('setConfigValue(dir,"phpMinVersion","8.2") updates manifest + project.config.json', async () => {
    await seedProject(tmpDir, { phpMinVersion: "7.4" });
    const result = await setConfigValue(tmpDir, "phpMinVersion", "8.2");
    expect(result.ok).toBe(true);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.phpMinVersion).toBe("8.2");

    const cfg = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpdev.json"), "utf8"),
    );
    expect(cfg.features.phpMinVersion).toBe("8.2");
  });

  test('setConfigValue(dir,"phpMinVersion","7.4") while faultTolerance:"on" returns {ok:false, reason}', async () => {
    await seedProject(tmpDir, {
      phpMinVersion: "8.1",
      faultTolerance: "on",
    });
    const result = await setConfigValue(tmpDir, "phpMinVersion", "7.4");
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/faultTolerance|phpMinVersion/i);
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
