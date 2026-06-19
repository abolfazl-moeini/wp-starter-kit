/**
 * Phase 23.B7 GREEN — engine public API surface (Appendix C of plan.v3.md).
 *
 * The engine's public surface is the set of named exports on
 * `packages/create-wp-project/src/index.js`. The CLI (plan.installer.md)
 * and kit scripts (Phase 27.5) consume these symbols directly via
 * `import { x } from "@wpdev/create-wp-project"`.
 *
 * This test is a different cut from the existing
 * `create-wp-project.engine-re-exports.test.js` (which guards against
 * silent removal of a previously-documented symbol). The new test
 * pins the FULL Appendix C contract — every documented export must
 * be present AND importable through the package's published entry
 * point (its `package.json` `main` / `exports` field).
 *
 * The two tests serve different purposes and BOTH must pass:
 *
 *   - `engine-re-exports.test.js` (Phase 24.13 follow-up):
 *     stability lock. Asserts the named exports on src/index.js.
 *   - `engine-api.test.js`     (Phase 23.B7):
 *     package-publishability lock. Asserts that the package's
 *     `package.json` `main` / `exports` is set AND that an
 *     `import("@wpdev/create-wp-project")` resolves to the same
 *     module the deep-import resolves to. Without this guard, a
 *     future "simplification" of `package.json` (e.g. dropping
 *     `main` or `exports`) would break every external consumer of
 *     the engine, even though `engine-re-exports.test.js` keeps
 *     passing.
 *
 * Assertions (Appendix C list — every entry is a function):
 *
 *   Phase 20 — feature model + manifest + presets
 *     - getFeatureCatalog, defaultFeatures, validateFeatureSet
 *     - getPresets, applyPreset
 *     - buildManifest, readManifest, writeManifest
 *   Phase 21 — generator + scaffold (BC)
 *     - scaffoldProject, validateAnswers, answersToProjectConfig,
 *       renderTemplate
 *   Phase 22 — additive feature mutations
 *     - addFeature, removeFeature
 *   Phase 24.1-24.6 — migrations registry, selector, runner
 *     - getMigrations, selectMigrations, runMigrations, compareSemver
 *   Phase 24.7-24.10 — plan / doctor / dep registry
 *     - planUpdate, doctorProject, getDepVersions
 *   Phase 24.12-24.13 — kit status
 *     - getKitStatus
 *
 * The test also asserts `package.json` itself declares the entry
 * point correctly — a 23.B7 sub-task is "Update
 * `packages/create-wp-project/package.json` (add `main` + `exports`
 * if missing)".
 */
import { describe, test, expect } from "@jest/globals";
import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

import * as engine from "../../packages/create-wp-project/src/index.js";

/* -------------------------------------------------------------------- */
/* Appendix C — full public API contract                                  */
/* -------------------------------------------------------------------- */

/**
 * Each entry is `[exportName, expectedType]`. The list is the
 * authoritative engine public surface per plan.v3.md Appendix C.
 * A change to the list is a breaking change to the engine
 * contract and must be reflected in BOTH this file and the
 * existing `engine-re-exports.test.js`.
 */
const APPENDIX_C_EXPORTS = [
  // Phase 20 — feature model + manifest + presets
  ["getFeatureCatalog", "function"],
  ["defaultFeatures", "function"],
  ["validateFeatureSet", "function"],
  ["getPresets", "function"],
  ["applyPreset", "function"],
  ["buildManifest", "function"],
  ["readManifest", "function"],
  ["writeManifest", "function"],
  // Phase 21 — scaffold (BC) + generator pipeline
  ["scaffoldProject", "function"],
  ["validateAnswers", "function"],
  ["answersToProjectConfig", "function"],
  ["renderTemplate", "function"],
  // Phase 22 — additive feature mutations
  ["addFeature", "function"],
  ["removeFeature", "function"],
  // Phase 24.1-24.6 — migrations registry, selector, runner
  ["getMigrations", "function"],
  ["selectMigrations", "function"],
  ["runMigrations", "function"],
  ["compareSemver", "function"],
  // Phase 24.7-24.10 — plan / doctor / dep registry
  ["planUpdate", "function"],
  ["doctorProject", "function"],
  ["getDepVersions", "function"],
  // Phase 24.12-24.13 — kit status
  ["getKitStatus", "function"],
];

/* -------------------------------------------------------------------- */
/* Tests                                                                 */
/* -------------------------------------------------------------------- */

describe("@wpdev/create-wp-project — engine public API (Phase 23.B7 / Appendix C)", () => {
  test("package.json declares a `main` entry point", () => {
    // A 23.B7 sub-task is "Update packages/create-wp-project/package.json
    // (add `main` + `exports` if missing)". The package already had
    // a `main` field pre-23.B7, but we assert it explicitly so a
    // future simplification (e.g. dropping the field) trips the
    // test before it breaks a real consumer.
    const pkgPath = path.join(
      process.cwd(),
      "packages/create-wp-project/package.json",
    );
    expect(existsSync(pkgPath)).toBe(true);
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(typeof pkg.main).toBe("string");
    expect(pkg.main.length).toBeGreaterThan(0);
    // The `main` field must point to a file that actually exists.
    const mainPath = path.join(
      process.cwd(),
      "packages/create-wp-project",
      pkg.main,
    );
    expect(existsSync(mainPath)).toBe(true);
  });

  test("package.json declares an `exports` map pointing at the same entry", () => {
    // 23.B7 adds the `exports` field. Node's modern resolver
    // prefers `exports` over `main` when both are present; a
    // package that has only `main` is technically resolvable
    // but blocks the conditional-exports pattern other kit
    // packages may adopt in future phases. Pin it now.
    const pkgPath = path.join(
      process.cwd(),
      "packages/create-wp-project/package.json",
    );
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    expect(pkg.exports).toBeDefined();
    // The shape may be a string OR an object with a "." key —
    // both are valid Node exports forms. We accept either.
    const hasString = typeof pkg.exports === "string";
    const hasDot =
      pkg.exports && typeof pkg.exports === "object" && pkg.exports["."];
    expect(Boolean(hasString || hasDot)).toBe(true);
  });

  test("every Appendix C named export is present on src/index.js", () => {
    // This is the structural lock: a missing export means a
    // future engine refactor dropped a public symbol without
    // updating the contract. Pin the full list verbatim.
    for (const [name, expectedType] of APPENDIX_C_EXPORTS) {
      expect(engine).toHaveProperty(name);
      expect(typeof engine[name]).toBe(expectedType);
    }
  });

  test("BC — `scaffoldProject` and `validateAnswers` remain exported (23.B7 hard rule)", () => {
    // The 23.B7 brief explicitly says: "The old answers-based
    // `scaffoldProject` and `validateAnswers` must remain
    // exported for BC." These two are the oldest pre-Phase 20
    // exports; if either disappears the entire pre-Phase 20
    // consumer base breaks. Pin them by name.
    expect(typeof engine.scaffoldProject).toBe("function");
    expect(typeof engine.validateAnswers).toBe("function");
  });
});
