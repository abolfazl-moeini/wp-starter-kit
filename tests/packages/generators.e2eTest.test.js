/**
 * e2eTest generator — Playwright + wp-env browser E2E for scaffolded plugins.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";
import { run as e2eTestRun } from "../../packages/create-wp-project/src/generators/e2eTest.js";
import { run as ciRun } from "../../packages/create-wp-project/src/generators/ci.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import { getPresets } from "../../packages/create-wp-project/src/presets.js";
import { releaseStripFileNames } from "../../packages/create-wp-project/src/release/prepareComposer.js";
import { buildPromptPlan } from "../../packages/cli/src/prompts.js";
import { parseFlags } from "../../packages/cli/src/flags.js";

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

describe("e2eTest generator", () => {
  test("emits wp-env + playwright files when playwright", () => {
    const out = e2eTestRun({
      answers: goodAnswers,
      cfg: {},
      features: { e2eTest: "playwright" },
      vars: { slug: "my-project" },
    });
    expect(out.files[".wp-env.json"]).toMatch(/plugins/);
    expect(out.files["playwright.config.js"]).toMatch(/tests\/e2e/);
    expect(out.files["playwright.config.js"]).toMatch(/createRequire/);
    expect(out.files["tests/e2e/config/global-setup.js"]).toMatch(
      /RequestUtils/,
    );
    expect(out.files["tests/e2e/specs/admin-smoke.spec.js"]).toMatch(
      /@wordpress\/e2e-test-utils-playwright/,
    );
    expect(out.files["tests/e2e/specs/admin-smoke.spec.js"]).toMatch(
      /My Project/,
    );
    expect(out.files["tests/e2e/specs/frontend-smoke.spec.js"]).toMatch(
      /createPost/,
    );
    expect(out.devDeps["@wordpress/e2e-test-utils-playwright"]).toBeDefined();
    expect(out.devDeps["@wordpress/env"]).toBeDefined();
  });

  test("emits nothing when none", () => {
    const out = e2eTestRun({
      answers: goodAnswers,
      features: { e2eTest: "none" },
      vars: {},
    });
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("ci includes e2e job when playwright", () => {
    const out = ciRun({
      features: {
        ci: "auto",
        phpTest: "phpunit",
        js: "typescript",
        jsTest: "jest",
        e2eTest: "playwright",
      },
    });
    expect(out.files[".github/workflows/ci.yml"]).toMatch(/npm run test:e2e/);
    expect(out.files[".github/workflows/ci.yml"]).toMatch(/playwright install/);
  });

  test("ci emits e2e-only workflow when no php/js tests", () => {
    const out = ciRun({
      features: {
        ci: "auto",
        phpTest: "none",
        js: "none",
        jsTest: "none",
        e2eTest: "playwright",
      },
    });
    const yml = out.files[".github/workflows/ci.yml"];
    expect(yml).toBeDefined();
    expect(yml).toMatch(/^\s+e2e:/m);
    expect(yml).toMatch(/npm run test:e2e/);
    expect(yml).not.toMatch(/^\s+test:/m);
  });
});

describe("e2eTest scaffold + presets + CLI", () => {
  let tmp;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-e2e-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("scaffold with e2eTest:playwright writes files and scripts", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: {
        ...defaultFeatures(),
        e2eTest: "playwright",
      },
    });
    expect(res.ok).toBe(true);
    await expect(
      fs.stat(path.join(tmp, "playwright.config.js")),
    ).resolves.toBeTruthy();
    await expect(
      fs.stat(path.join(tmp, "tests/e2e/specs/admin-smoke.spec.js")),
    ).resolves.toBeTruthy();
    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.scripts["test:e2e"]).toMatch(/test-playwright/);
    expect(pkg.scripts["wp-env"]).toBe("wp-env");
    expect(pkg.devDependencies["@wordpress/env"]).toBeDefined();
    const ci = await fs.readFile(
      path.join(tmp, ".github/workflows/ci.yml"),
      "utf8",
    );
    expect(ci).toMatch(/test:e2e/);
  });

  test("js:none + e2eTest:playwright emits lean package.json", async () => {
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: {
        ...defaultFeatures(),
        js: "none",
        jsTest: "none",
        e2eTest: "playwright",
      },
    });
    expect(res.ok).toBe(true);
    const pkg = JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
    expect(pkg.scripts["test:e2e"]).toMatch(/test-playwright/);
    expect(pkg.scripts.build).toBeUndefined();
    expect(pkg.devDependencies["@wordpress/env"]).toBeDefined();
    expect(pkg.devDependencies["@wordpress/scripts"]).toBeDefined();
    expect(pkg.devDependencies.webpack).toBeUndefined();
  });

  test("full preset enables playwright; standard does not", () => {
    const presets = Object.fromEntries(
      getPresets().map((p) => [p.id, p.features]),
    );
    expect(presets.full.e2eTest).toBe("playwright");
    expect(presets.standard.e2eTest).toBe("none");
    expect(presets.minimal.e2eTest ?? "none").toBe("none");
  });

  test("prompt plan and flags include e2eTest", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const q = plan.find((item) => item.id === "e2eTest");
    expect(q).toBeDefined();
    expect(q.message).toMatch(/E2E/i);
    const parsed = parseFlags(["--e2e-test=playwright"]);
    expect(parsed.features.e2eTest).toBe("playwright");
  });

  test("release strip lists playwright.config.js", () => {
    expect(releaseStripFileNames()).toContain("playwright.config.js");
  });
});
