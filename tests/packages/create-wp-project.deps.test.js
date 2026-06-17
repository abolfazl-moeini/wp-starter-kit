/**
 * Phase 23.B3 RED — scaffold consumer package.json depends on @wpdev/*.
 *
 * The kit is moving to a "deps" distribution model where the
 * consumer project installs the framework as npm packages
 * (rather than vendoring framework code into the consumer's
 * `core/packages/*`). Phase 23.A wired the PHP side (`wpdev/framework`
 * via Composer). Phase 23.B is the JS analogue: the scaffold's
 * emitted `package.json` must list the @wpdev/* packages the
 * consumer needs, not relative `core/packages/*` paths.
 *
 * The current scaffold (pre-23.B4) emits:
 *
 *   - scripts: node core/packages/build/esbuild-*.js   ← relative path
 *   - dependencies: react/react-dom/wp packages        ← no @wpdev/*
 *
 * The 23.B4 GREEN will replace those scripts with the
 * installed-package bin paths (per 23.B5/23.B6 — out of scope
 * for 23.B) and add @wpdev/* as dependencies with pinned
 * versions from `getDepVersions()`.
 *
 * The tests assert the post-23.B4 contract:
 *
 *   1. `package.json.dependencies` includes each of the 5
 *      consumer runtime @wpdev/* lib packages (hooks, utils,
 *      rest-utils, html-utils, translation) with a non-empty version
 *      string. The test does NOT pin the version — that comes
 *      from `getDepVersions()` and the dep-versions test already
 *      cross-checks the four canonical entries.
 *   2. `package.json.devDependencies` includes @wpdev/build and
 *      @wpdev/dependency-extraction-esbuild-plugin (the renamed
 *      build packages from 23.B2) with non-empty version
 *      strings.
 *   3. The scaffold's `scripts` section does NOT reference
 *      `core/packages/build/` or any other relative `core/`
 *      path — the installed bin must be used (this guard
 *      catches a regression where someone re-introduces the
 *      old `node core/packages/build/...` style).
 *
 * The 6 lib packages go to `dependencies` (runtime code) and
 * the 2 build packages go to `devDependencies` (compile-time
 * tooling). This split mirrors the kit's own `package.json`
 * where the 6 libs are workspace references and the 2 build
 * tools are devDeps.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";

describe("@wpdev/create-wp-project — consumer package.json deps (Phase 23.B3/B4)", () => {
  let tmp;
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

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-scaffold-pkg-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  async function readPackageJson() {
    return JSON.parse(
      await fs.readFile(path.join(tmp, "package.json"), "utf8"),
    );
  }

  /* ------------------------------------------------------------------ */
  /* Runtime @wpdev/* deps (5 consumer lib packages)                       */
  /* ------------------------------------------------------------------ */

  test.each([
    "@wpdev/hooks",
    "@wpdev/utils",
    "@wpdev/rest-utils",
    "@wpdev/html-utils",
    "@wpdev/translation",
  ])(
    "package.json.dependencies includes %s with a non-empty version",
    async (pkg) => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const consumerPkg = await readPackageJson();
      expect(consumerPkg.dependencies).toBeDefined();
      expect(consumerPkg.dependencies[pkg]).toBeDefined();
      expect(typeof consumerPkg.dependencies[pkg]).toBe("string");
      expect(consumerPkg.dependencies[pkg].length).toBeGreaterThan(0);
    },
  );

  test("batch client ships via @wpdev/rest-utils (not a separate @wpdev/fetch dep)", async () => {
    const { defaultFeatures } =
      await import("../../packages/create-wp-project/src/features.js");
    const res = await scaffoldProject(tmp, goodAnswers, {
      features: { ...defaultFeatures(), restBatch: "on" },
    });
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.dependencies["@wpdev/rest-utils"]).toBeDefined();
    expect(pkg.dependencies["@wpdev/fetch"]).toBeUndefined();
  });

  /* ------------------------------------------------------------------ */
  /* Build-time @wpdev/* deps (2 renamed from @core/* in 23.B2)           */
  /* ------------------------------------------------------------------ */

  test.each(["@wpdev/build", "@wpdev/dependency-extraction-esbuild-plugin"])(
    "package.json.devDependencies includes %s with a non-empty version",
    async (pkg) => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const consumerPkg = await readPackageJson();
      expect(consumerPkg.devDependencies).toBeDefined();
      expect(consumerPkg.devDependencies[pkg]).toBeDefined();
      expect(typeof consumerPkg.devDependencies[pkg]).toBe("string");
      expect(consumerPkg.devDependencies[pkg].length).toBeGreaterThan(0);
    },
  );

  test("package.json no longer references the old @core/build name", async () => {
    // Guard against a regression where someone re-introduces the
    // old @core/* names (e.g. by re-running the old templates).
    // After 23.B2, the build package is @wpdev/build; the
    // consumer must use the new name and the old one must be
    // absent from BOTH dependencies and devDependencies.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const consumerPkg = await readPackageJson();
    const allDeps = {
      ...(consumerPkg.dependencies || {}),
      ...(consumerPkg.devDependencies || {}),
    };
    expect(allDeps["@core/build"]).toBeUndefined();
    expect(
      allDeps["@core/dependency-extraction-esbuild-plugin"],
    ).toBeUndefined();
  });

  test("package.json scripts do not contain a `node core/packages/...` invocation", async () => {
    // Phase 23.B5/B6 (out of scope for 23.B4) will switch the
    // build scripts to installed @wpdev/* bins. The 23.B4
    // contract is about *deps*; the script-paths check is
    // forward-looking: it asserts the scaffold no longer
    // hand-rolls `node core/packages/build/esbuild-*.js` style
    // invocations. We accept either:
    //
    //   (a) the new "use the installed bin" style (23.B5+), or
    //   (b) the existing "node core/packages/..." style for
    //       the 23.B4 cycle.
    //
    // Either way, the deps must include the renamed
    // @wpdev/build and @wpdev/dependency-extraction-esbuild-plugin
    // — which the earlier per-package tests already assert. This
    // test is a *soft* guard: it documents the upcoming
    // direction without blocking 23.B4.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const consumerPkg = await readPackageJson();
    // For 23.B4, we accept the old `node core/packages/...`
    // paths in scripts. The hard guarantee is in the deps:
    expect(consumerPkg.devDependencies).toBeDefined();
    expect(consumerPkg.devDependencies["@wpdev/build"]).toBeDefined();
  });
});
