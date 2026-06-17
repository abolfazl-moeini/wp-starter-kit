/**
 * Phase 23.B1 RED — publishable JS package metadata.
 *
 * The kit is moving from "the consumer installs @wpdev/* from npm"
 * (publishable) to a coherent `@wpdev/*` scope. The first half of
 * that move is to assert that each shippable package is *actually*
 * shaped like a publishable npm package: it has a `name`, a
 * `version`, an entry point (`main` or `exports`), a `files`
 * whitelist, and it is not `private:true` (a `private:true` flag
 * would block `npm publish`, which is exactly what we don't want
 * for these packages).
 *
 * The eight packages under test are:
 *
 *   packages/hooks                                  -> @wpdev/hooks
 *   packages/utils                                  -> @wpdev/utils
 *   packages/rest-utils                             -> @wpdev/rest-utils
 *   packages/html-utils                             -> @wpdev/html-utils
 *   packages/fetch                                  -> @wpdev/fetch
 *   packages/translation                            -> @wpdev/translation
 *   core/packages/build                             -> @wpdev/build
 *   core/packages/dependency-extraction-esbuild-plugin
 *                                                    -> @wpdev/dependency-extraction-esbuild-plugin
 *
 * Scope is unified to `@wpdev/*` (single-scope decision from
 * plan.v3.md §23.B2). The previous `@core/*` names for the build
 * tooling are renamed in 23.B2 — this test asserts the
 * post-rename shape, so it goes RED until 23.B2 lands.
 *
 * Hard rules (from the task brief):
 *   - Do NOT touch `packages/cli/**` (sibling scope, already shipped).
 *   - Do NOT touch `packages/framework/**` (PHP framework, shipped in 23.A).
 *   - Workspace resolution MUST keep working (the kit's root
 *     `workspaces` field resolves `packages/*` and `core/packages/*`).
 *
 * The test runs without any side effects: it only reads
 * `package.json` files. It does not import the packages, so a
 * missing `main` file does NOT fail the test — only a missing
 * `main`/`exports` field does. That's the contract we want:
 * "the metadata is publishable" is a separate concern from "the
 * code resolves at runtime".
 */
import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import * as path from "node:path";

/* -------------------------------------------------------------------- */
/* Canonical package list                                                */
/* -------------------------------------------------------------------- */

/**
 * The list of shippable packages. Each entry is
 * `{ dir, expectedName, minFiles }` where:
 *   - `dir`         is the directory relative to the kit root
 *   - `expectedName` is the canonical `@wpdev/*` name
 *   - `minFiles`    is the minimum number of `files` whitelist
 *                   entries (a publishable package must declare
 *                   a whitelist, and an empty array is treated
 *                   as "publish everything" by npm — we want a
 *                   non-empty whitelist so the kit can rely on
 *                   the published tarball containing only the
 *                   build artifacts)
 *
 * The list is the single source of truth for "which packages
 * must be publishable". Adding a new shippable package means
 * adding an entry here AND a matching `files` whitelist in
 * the package's `package.json`.
 */
const SHIPPABLE_PACKAGES = [
  {
    dir: "packages/hooks",
    expectedName: "@wpdev/hooks",
    minFiles: 1,
  },
  {
    dir: "packages/utils",
    expectedName: "@wpdev/utils",
    minFiles: 1,
  },
  {
    dir: "packages/rest-utils",
    expectedName: "@wpdev/rest-utils",
    minFiles: 1,
  },
  {
    dir: "packages/html-utils",
    expectedName: "@wpdev/html-utils",
    minFiles: 1,
  },
  {
    dir: "packages/fetch",
    expectedName: "@wpdev/fetch",
    minFiles: 1,
  },
  {
    dir: "packages/translation",
    expectedName: "@wpdev/translation",
    minFiles: 1,
  },
  {
    dir: "core/packages/build",
    expectedName: "@wpdev/build",
    minFiles: 1,
  },
  {
    dir: "core/packages/dependency-extraction-esbuild-plugin",
    expectedName: "@wpdev/dependency-extraction-esbuild-plugin",
    minFiles: 1,
  },
];

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

function readPkg(relDir) {
  const pkgPath = path.join(process.cwd(), relDir, "package.json");
  return { pkg: JSON.parse(readFileSync(pkgPath, "utf8")), pkgPath };
}

/* -------------------------------------------------------------------- */
/* Tests                                                                 */
/* -------------------------------------------------------------------- */

describe("@wpdev/* packages — publishable metadata (Phase 23.B1)", () => {
  test("all shippable packages are listed (no missing entries)", () => {
    // The list has 8 entries. This test guards against silent
    // removal — if someone drops an entry from the list, the
    // per-package tests below will still pass on the remaining
    // packages, hiding a regression in the kit's "what we ship"
    // surface. The count check is the safety net.
    expect(SHIPPABLE_PACKAGES.length).toBe(8);
  });

  describe("per-package metadata", () => {
    for (const { dir, expectedName, minFiles } of SHIPPABLE_PACKAGES) {
      describe(expectedName, () => {
        let pkg;

        // Lazy read so the test file can enumerate packages
        // without throwing on a missing file (a missing file
        // will surface as a clear test failure below).
        const load = () => {
          if (!pkg) {
            try {
              pkg = readPkg(dir).pkg;
            } catch (e) {
              throw new Error(`Cannot read ${dir}/package.json — ${e.message}`);
            }
          }
          return pkg;
        };

        test("name is the canonical @wpdev/* scoped name", () => {
          expect(load().name).toBe(expectedName);
        });

        test("has a semver version string", () => {
          // Accept any non-empty string that looks like semver.
          // We don't pin to X.Y.Z format because a future
          // pre-release tag (e.g. "0.2.0-rc.1") should also
          // pass — the test is about *presence*, not shape.
          const v = load().version;
          expect(typeof v).toBe("string");
          expect(v.length).toBeGreaterThan(0);
          expect(v).toMatch(/^\d+\.\d+\.\d+/);
        });

        test("declares a main entry OR an exports map", () => {
          // Either is acceptable. The test asserts at least one
          // of the two is present — a package with NEITHER is
          // not resolvable by Node and is therefore unpublishable
          // in any meaningful sense.
          const p = load();
          const hasMain = typeof p.main === "string" && p.main.length > 0;
          const hasExports =
            p.exports &&
            (typeof p.exports === "string" ||
              (typeof p.exports === "object" && p.exports["."]));
          expect(hasMain || hasExports).toBe(true);
        });

        test("has a non-empty files whitelist", () => {
          // An empty `files: []` is treated by npm as "publish
          // nothing" — that's a footgun, not a feature. We
          // require at least `minFiles` entries. The list
          // is checked as a guard against future maintainers
          // who might add a `files: []` thinking it means
          // "publish everything" (it does NOT).
          const files = load().files;
          expect(Array.isArray(files)).toBe(true);
          expect(files.length).toBeGreaterThanOrEqual(minFiles);
        });

        test("is not private:true (must be publishable)", () => {
          // A `private:true` flag blocks `npm publish`. The kit
          // is moving toward a "publish the framework as real
          // npm packages" model in Phase 23.B, so these
          // packages must be unprivate. (The kit's OWN root
          // `package.json` stays `private:true` — the kit is
          // the *aggregator*, not a published package.)
          expect(load().private).not.toBe(true);
        });
      });
    }
  });
});
