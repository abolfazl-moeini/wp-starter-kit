import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { validateProjectConfig } from "../../packages/create-wp-project/src/validate-config.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

const REQUIRED_PROJECT_KEYS = [
  "slug",
  "globalName",
  "localizeVar",
  "textDomain",
  "hookPrefix",
  "npmScope",
  "depsBundle",
  "restNamespace",
  "batchEndpoint",
  "vendorPrefix",
  "phpMinVersion",
  "phpSourceVersion",
];

function defaultProjectConfig(overrides = {}) {
  return {
    slug: "my-plugin",
    globalName: "MyPlugin",
    localizeVar: "MyPluginLoc",
    textDomain: "my-plugin",
    hookPrefix: "my_plugin",
    npmScope: "@my-org",
    depsBundle: "my-plugin-deps.js",
    restNamespace: "my-plugin/v1",
    batchEndpoint: "/batch/v1",
    vendorPrefix: "MyPluginVendor",
    uiFramework: "preact",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    ...overrides,
  };
}

async function seedProject(dir, { project = {}, features } = {}) {
  const cfg = defaultProjectConfig(project);
  const merged = {
    schema: 2,
    kitVersion: "1.0.0",
    distMode: "deps",
    generatedAt: "2026-01-01T00:00:00.000Z",
    ...cfg,
    features: features || defaultFeatures(),
  };
  await fs.writeFile(
    path.join(dir, "wpdev.json"),
    JSON.stringify(merged, null, 2) + "\n",
    "utf8",
  );
}

describe("validateProjectConfig()", () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-validate-cfg-"));
  });

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("missing required field slug → errors mention slug", async () => {
    const cfg = defaultProjectConfig();
    delete cfg.slug;
    await fs.writeFile(
      path.join(tmpDir, "wpdev.json"),
      JSON.stringify(cfg, null, 2) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmpDir, "wpdev.json"),
      JSON.stringify({ schema: 1, features: defaultFeatures() }, null, 2) +
        "\n",
      "utf8",
    );
    const result = validateProjectConfig(tmpDir);
    expect(result.errors.some((e) => /slug/i.test(e))).toBe(true);
  });

  test("phpMinVersion drift between manifest and project.config → drift error", async () => {
    await seedProject(tmpDir, {
      project: { phpMinVersion: "7.4" },
      features: { ...defaultFeatures(), phpMinVersion: "8.1" },
    });
    const result = validateProjectConfig(tmpDir);
    expect(result.errors.some((e) => /drift|phpMinVersion/i.test(e))).toBe(
      true,
    );
  });

  test("consistent configs → empty errors and warnings", async () => {
    await seedProject(tmpDir, {
      project: { uiFramework: "preact" },
      features: { ...defaultFeatures(), jsLib: "preact" },
    });
    const result = validateProjectConfig(tmpDir);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("every required project.config key is checked", async () => {
    for (const key of REQUIRED_PROJECT_KEYS) {
      const dir = await fs.mkdtemp(
        path.join(os.tmpdir(), "wpdev-validate-key-"),
      );
      const cfg = defaultProjectConfig();
      delete cfg[key];
      await fs.writeFile(
        path.join(dir, "wpdev.json"),
        JSON.stringify(cfg, null, 2) + "\n",
        "utf8",
      );
      await fs.writeFile(
        path.join(dir, "wpdev.json"),
        JSON.stringify({ schema: 1, features: defaultFeatures() }, null, 2) +
          "\n",
        "utf8",
      );
      const result = validateProjectConfig(dir);
      expect(result.errors.some((e) => new RegExp(key, "i").test(e))).toBe(
        true,
      );
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
