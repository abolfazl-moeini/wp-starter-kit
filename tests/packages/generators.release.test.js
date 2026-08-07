/**
 * Scaffold emits a production release packager and wires npm/composer scripts.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import {
  run as coreRun,
  descriptor as coreDescriptor,
} from "../../packages/create-wp-project/src/generators/core.js";

const goodAnswers = {
  slug: "my-project",
  npmScope: "myorg",
  globalName: "MyProject",
  localizeVar: "MyProjectLoc",
  textDomain: "my-project",
  hookPrefix: "my-project",
  depsBundle: "my-project-deps.js",
  phpFunctionPrefix: "myprj_",
  uiFramework: "preact",
};

function makeCtx(features = {}) {
  const a = { ...goodAnswers, projectType: "plugin" };
  const c = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar,
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: "@" + a.npmScope,
    depsBundle: a.depsBundle,
    phpFunctionPrefix: a.phpFunctionPrefix,
    uiFramework: a.uiFramework,
    projectType: a.projectType,
    restNamespace: "my-project/v1",
    vendorPrefix: "MyProjectVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  const f = {
    js: "typescript",
    jsLib: "preact",
    husky: "off",
    vendorScoping: "on",
    license: "gpl2",
    phpMinVersion: "7.4",
    ...features,
  };
  return { answers: a, cfg: c, features: f, vars: null };
}

describe("core generator — release packager", () => {
  test("owns dev/release/**", () => {
    expect(coreDescriptor.owns).toEqual(
      expect.arrayContaining(["dev/release/**"]),
    );
  });

  test("emits prepare-release.js, prepareComposer.js, and releaseTests.js", () => {
    const contrib = coreRun(makeCtx());
    expect(contrib.files["dev/release/prepare-release.js"]).toBeDefined();
    expect(contrib.files["dev/release/prepareComposer.js"]).toBeDefined();
    expect(contrib.files["dev/release/releaseTests.js"]).toBeDefined();
    expect(contrib.files["dev/release/prepare-release.js"]).toMatch(
      /prepareRelease/,
    );
    expect(contrib.files["dev/release/prepareComposer.js"]).toMatch(
      /prepareComposerForRelease/,
    );
    expect(contrib.files["dev/release/releaseTests.js"]).toMatch(
      /resolveReleaseTestPlan/,
    );
    expect(contrib.files["dev/release/prepare-release.js"]).toMatch(
      /skip-tests/,
    );
  });

  test("package.json release script builds then packages", () => {
    const contrib = coreRun(makeCtx({ js: "typescript" }));
    const pkg = JSON.parse(contrib.files["package.json"]);
    expect(pkg.scripts.release).toBe(
      "npm run build && node dev/release/prepare-release.js",
    );
  });

  test("composer.json has release:dist, php require, and platform.php", () => {
    const contrib = coreRun(makeCtx());
    const composer = JSON.parse(contrib.files["composer.json"]);
    expect(composer.require.php).toBe(">=7.4");
    expect(composer.config.platform.php).toBe("7.4");
    expect(composer.scripts["release:dist"]).toBe(
      "node dev/release/prepare-release.js",
    );
  });
});

describe("scaffoldProject — release packager on disk", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-scaffold-release-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("writes release scripts and wires package/composer commands", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);

    await expect(
      fs.stat(path.join(tmp, "dev/release/prepare-release.js")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(tmp, "dev/release/prepareComposer.js")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(tmp, "dev/release/releaseTests.js")),
    ).resolves.toBeTruthy();

    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.scripts.release).toMatch(/prepare-release\.js/);

    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.scripts["release:dist"]).toMatch(/prepare-release\.js/);
    expect(composer.require.php).toMatch(/^>=/);
    expect(composer.config.platform.php).toBeDefined();
  });
});
