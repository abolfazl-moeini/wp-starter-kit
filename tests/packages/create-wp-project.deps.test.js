/**
 * Phase 23.B3 RED — scaffold consumer package.json depends on @wpsk/*.
 *
 * The kit is moving to a "deps" distribution model where the
 * consumer project installs the framework as npm packages
 * (rather than vendoring framework code into the consumer's
 * `core/packages/*`). Phase 23.A wired the PHP side (`wpsk/framework`
 * via Composer). Phase 23.B is the JS analogue: the scaffold's
 * emitted `package.json` must list the @wpsk/* packages the
 * consumer needs, not relative `core/packages/*` paths.
 *
 * The current scaffold (pre-23.B4) emits:
 *
 *   - scripts: node core/packages/build/esbuild-*.js   ← relative path
 *   - dependencies: react/react-dom/wp packages        ← no @wpsk/*
 *
 * The 23.B4 GREEN will replace those scripts with the
 * installed-package bin paths (per 23.B5/23.B6 — out of scope
 * for 23.B) and add @wpsk/* as dependencies with pinned
 * versions from `getDepVersions()`.
 *
 * The tests assert the post-23.B4 contract:
 *
 *   1. `package.json.dependencies` includes each of the 6
 *      shippable @wpsk/* lib packages (hooks, utils, rest-utils,
 *      html-utils, fetch, translation) with a non-empty version
 *      string. The test does NOT pin the version — that comes
 *      from `getDepVersions()` and the dep-versions test already
 *      cross-checks the four canonical entries.
 *   2. `package.json.devDependencies` includes @wpsk/build and
 *      @wpsk/dependency-extraction-esbuild-plugin (the renamed
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

describe("@wpsk/create-wp-project — consumer package.json deps (Phase 23.B3/B4)", () => {
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
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-scaffold-pkg-"));
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
  /* Runtime @wpsk/* deps (6 lib packages)                                */
  /* ------------------------------------------------------------------ */

  test.each([
    "@wpsk/hooks",
    "@wpsk/utils",
    "@wpsk/rest-utils",
    "@wpsk/html-utils",
    "@wpsk/fetch",
    "@wpsk/translation",
  ])(
    "package.json.dependencies includes %s with a non-empty version",
    async (pkg) => {
      const res = await scaffoldProject(tmp, goodAnswers);
      expect(res.ok).toBe(true);
      const consumerPkg = await readPackageJson();
      expect(consumerPkg.dependencies).toBeDefined();
      expect(consumerPkg.dependencies[pkg]).toBeDefined();
      expect(typeof consumerPkg.dependencies[pkg]).toBe("string");
      // The version must be a non-empty string. It may be "*",
      // a semver range, or a pinned exact version. The
      // dep-versions registry is the source of truth — this
      // test only checks presence, not the exact value.
      expect(consumerPkg.dependencies[pkg].length).toBeGreaterThan(0);
    },
  );

  /* ------------------------------------------------------------------ */
  /* Build-time @wpsk/* deps (2 renamed from @core/* in 23.B2)           */
  /* ------------------------------------------------------------------ */

  test.each([
    "@wpsk/build",
    "@wpsk/dependency-extraction-esbuild-plugin",
  ])(
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
    // After 23.B2, the build package is @wpsk/build; the
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
    expect(allDeps["@core/dependency-extraction-esbuild-plugin"]).toBeUndefined();
  });

  /* ------------------------------------------------------------------ */
  /* No relative core/packages/* paths in scripts                         */
  /* ------------------------------------------------------------------ */

  test("package.json scripts do not reference core/packages/* paths", async () => {
    // The 23.B4 GREEN switches the build scripts to use the
    // installed @wpsk/build bins. A relative `core/packages/...`
    // path would tie the consumer to a workspace layout that
    // disappears once the framework is published. We assert no
    // script value contains a `core/packages/` segment.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const consumerPkg = await readPackageJson();
    const scripts = consumerPkg.scripts || {};
    for (const [name, value] of Object.entries(scripts)) {
      expect(typeof value).toBe("string");
      // The check is intentionally a substring match on
      // `core/packages/` — that segment can only come from a
      // relative path or a Node CLI invocation, both of which
      // we want to eliminate in 23.B4.
      expect(value.includes("core/packages/")).toBe(false);
    }
  });
});
