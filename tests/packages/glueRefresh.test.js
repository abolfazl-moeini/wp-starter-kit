/**
 * Code-review fix — refreshGlue after addFeature / removeFeature.
 *
 * Glue files (package.json scripts, tsconfig.json, composer.json
 * patches) depend on the full feature set. Feature mutations must
 * re-run the core generator for those paths only — never product
 * files (plugin bootstrap PHP, README, packages/*).
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { removeFeature } from "../../packages/create-wp-project/src/removeFeature.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";
import { refreshGlue } from "../../packages/create-wp-project/src/refresh-glue.js";

async function seedProject(tmp, features) {
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
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  await fs.writeFile(
    path.join(tmp, "wpdev.json"),
    JSON.stringify({ ...cfg, features: { ...features } }, null, 2) + "\n",
    "utf8",
  );
  await writeManifest(
    tmp,
    buildManifest({
      kitVersion: "0.1.0",
      features,
      generatedAt: "2026-06-15T00:00:00.000Z",
    }),
  );
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

describe("refreshGlue after feature mutations", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-glue-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("addFeature(jsTest: jest → vitest) updates package.json scripts.test", async () => {
    const features = {
      ...defaultFeatures(),
      js: "typescript",
      jsTest: "jest",
    };
    await seedProject(tmp, features);
    await refreshGlue(tmp, features);
    await fs.writeFile(
      path.join(tmp, "jest.config.mjs"),
      "export default {};\n",
      "utf8",
    );

    const before = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(before.scripts.test).toBe("jest");

    const res = await addFeature(tmp, "jsTest", "vitest");
    expect(res.ok).toBe(true);

    const after = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(after.scripts.test).toBe("vitest run");
    expect(after.devDependencies.vitest).toBeDefined();
    expect(await fileExists(path.join(tmp, "vitest.config.ts"))).toBe(true);
  });

  test("addFeature preserves user-customized project.config.json keys", async () => {
    const features = { ...defaultFeatures() };
    await seedProject(tmp, features);
    await refreshGlue(tmp, features);

    const cfgPath = path.join(tmp, "wpdev.json");
    const cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    cfg.restNamespace = "custom/v1";
    await fs.writeFile(cfgPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");

    // Mutate a real toggle (blocks feature removed from catalog).
    await addFeature(tmp, "restBatch", "on");

    const after = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    expect(after.restNamespace).toBe("custom/v1");
  });

  test("refreshGlue does not overwrite plugin bootstrap, README, or packages/*", async () => {
    const features = {
      ...defaultFeatures(),
      js: "none",
      jsTest: "none",
      husky: "off",
      e2eTest: "none",
    };
    await seedProject(tmp, features);
    await refreshGlue(tmp, features);

    const bootstrap = path.join(tmp, "my-project.php");
    const readme = path.join(tmp, "README.md");
    const pkgDir = path.join(tmp, "packages", "framework", "src");
    await fs.mkdir(pkgDir, { recursive: true });
    await fs.writeFile(bootstrap, "<?php // CUSTOM BOOTSTRAP\n", "utf8");
    await fs.writeFile(readme, "# Custom README\n", "utf8");
    await fs.writeFile(
      path.join(pkgDir, "Custom.php"),
      "<?php // keep me\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify(
        {
          name: "acme/custom",
          require: { php: ">=8.1" },
          autoload: { files: ["src/custom-register.php"] },
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );

    const res = await addFeature(tmp, "e2eTest", "playwright");
    expect(res.ok).toBe(true);

    expect(await fs.readFile(bootstrap, "utf8")).toContain("CUSTOM BOOTSTRAP");
    expect(await fs.readFile(readme, "utf8")).toContain("Custom README");
    expect(
      await fs.readFile(path.join(pkgDir, "Custom.php"), "utf8"),
    ).toContain("keep me");

    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.name).toBe("acme/custom");
    expect(composer.autoload.files).toEqual(["src/custom-register.php"]);
    expect(await fileExists(path.join(tmp, ".wp-env.json"))).toBe(true);
    expect(await fileExists(path.join(tmp, "playwright.config.js"))).toBe(true);
  });

  test("removeFeature(js) drops package.json and tsconfig.json when husky is off", async () => {
    const features = {
      ...defaultFeatures(),
      js: "typescript",
      jsTest: "none",
      css: "none",
      husky: "off",
    };
    await seedProject(tmp, features);
    await refreshGlue(tmp, features);
    await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "assets", "dependencies.ts"),
      "// js artifact\n",
      "utf8",
    );

    expect(await fileExists(path.join(tmp, "package.json"))).toBe(true);
    expect(await fileExists(path.join(tmp, "tsconfig.json"))).toBe(true);

    const res = await removeFeature(tmp, "js");
    expect(res.ok).toBe(true);
    expect(res.written).toEqual(
      expect.arrayContaining(["-package.json", "-tsconfig.json"]),
    );
    expect(await fileExists(path.join(tmp, "package.json"))).toBe(false);
    expect(await fileExists(path.join(tmp, "tsconfig.json"))).toBe(false);
    expect(await fileExists(path.join(tmp, "assets/dependencies.ts"))).toBe(
      false,
    );
  });
});
