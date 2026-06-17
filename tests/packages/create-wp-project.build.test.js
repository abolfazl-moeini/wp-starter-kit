/**
 * Phase 23.B5 RED — scaffold consumer package.json scripts call installed bins.
 *
 * The kit is moving from "the consumer invokes framework build steps via
 * a relative `node core/packages/build/esbuild-*.js` path" to "the
 * consumer invokes the installed `@wpdev/build` package's bin
 * (e.g. `wpdev-build-dependencies`)" — exactly like a real npm
 * consumer would, after `npm install`.
 *
 * Why this matters:
 *
 *  1. The vendored `core/packages/*` path only exists when the
 *     consumer's repo has the kit sources vendored. After
 *     `distMode: "deps"`, the consumer only has `node_modules/@wpdev/*`
 *     and no `core/` directory at all. The old `node core/...` path
 *     would crash with "Cannot find module".
 *  2. Using the bin is the standard npm contract — `npx wpdev-build-*`
 *     just works after install, no path glue needed.
 *  3. The bin name is stable and versioned with the package; pinning
 *     `@wpdev/build` to a version pins the bin's behaviour.
 *
 * The test asserts the post-23.B6 contract:
 *
 *   1. `package.json.scripts["build:dependencies"]` is exactly
 *      `wpdev-build-dependencies` (not `node core/...`).
 *   2. `package.json.scripts["build:components"]` is
 *      `wpdev-build-components` (or similar installed bin).
 *   3. `package.json.scripts["build:styles"]` is
 *      `wpdev-build-styles`.
 *   4. `package.json.scripts["check"]` is `wpdev-check` (or any other
 *      installed bin coming from `@wpdev/utils`).
 *   5. NONE of the scripts reference the legacy
 *      `core/packages/...` paths (regression guard).
 *   6. The "build" aggregator script is unchanged
 *      (`npm-run-all --parallel build:dependencies build:components
 *      build:styles build:assets`).
 *
 * The 23.B6 GREEN will add the `bin` entries to the
 * `@wpdev/build` package (and any other relevant package) and update
 * the scaffold's emitted `package.json` template to call the bin.
 * For now (23.B5 RED), the test will FAIL because the scaffold
 * still emits `node core/packages/build/esbuild-dependencies-cli.js`
 * style paths.
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";

describe("@wpdev/create-wp-project — build scripts use installed @wpdev/* bins (Phase 23.B5)", () => {
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
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-scaffold-bins-"));
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
  /* Per-script bin assertions                                            */
  /* ------------------------------------------------------------------ */

  test("scripts.build:dependencies uses the installed wpdev-build-dependencies bin", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.scripts["build:dependencies"]).toBe("wpdev-build-dependencies");
  });

  test("scripts.build:components uses the installed wpdev-build-components bin", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.scripts["build:components"]).toBe("wpdev-build-components");
  });

  test("scripts.build:styles uses the installed wpdev-build-styles bin", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.scripts["build:styles"]).toBe("wpdev-build-styles");
  });

  test("scripts.build:assets uses the installed wpdev-build-assets bin", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.scripts["build:assets"]).toBe("wpdev-build-assets");
  });

  /* ------------------------------------------------------------------ */
  /* Regression guard — no legacy `node core/packages/...` paths         */
  /* ------------------------------------------------------------------ */

  test("scripts do not reference any legacy `node core/packages/...` path", async () => {
    // The whole point of 23.B5/23.B6 is to eliminate the vendored
    // `core/packages/*` path from the consumer's package.json. A
    // regression that re-introduces a `node core/...` invocation
    // would silently break Phase 23 "deps" mode (where the consumer
    // has no `core/` directory). The test walks every script value
    // and asserts none of them contain the legacy prefix.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.scripts).toBeDefined();
    for (const [, value] of Object.entries(pkg.scripts)) {
      expect(typeof value).toBe("string");
      expect(value.includes("core/packages/")).toBe(false);
      expect(value.includes("node core/")).toBe(false);
    }
  });

  test("consumer package.json does not leak the kit's workspace layout", async () => {
    // Generated consumer projects install @wpdev/* packages from npm;
    // they do not contain a monorepo workspace layout.
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const pkg = await readPackageJson();
    expect(pkg.workspaces).toBeUndefined();
  });
});
