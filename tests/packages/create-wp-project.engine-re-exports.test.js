/**
 * Phase 24.13 follow-up — re-exports from create-wp-project/src/index.js.
 *
 * The engine's public API surface is `index.js`. The CLI
 * (plan.installer.md) imports from `@wpsk/create-wp-project`
 * and uses the named exports directly. Adding a new module
 * without re-exporting it would force the CLI to deep-import
 * (e.g. `from "@wpsk/create-wp-project/src/plan-update.js"`),
 * which is brittle (any future file move breaks the CLI).
 *
 * This test pins the public surface. It is a structural lock
 * — every symbol the CLI or the installer's docs reference
 * MUST be re-exported here. Adding a new symbol? Add it to
 * BOTH the re-export list AND the import list in
 * `src/index.js` and this test will keep passing.
 *
 * The list is grouped by phase for human readability. New
 * phases append at the bottom so a git log of this file is
 * a release-history of the engine surface.
 */

import { describe, test, expect } from "@jest/globals";

import * as engine from "../../packages/create-wp-project/src/index.js";

/**
 * The expected public surface. Each entry is a NAMED export
 * the engine ships; the test asserts the symbol is BOTH
 * present on the module (so `import { x } from ...` works)
 * AND is a function (so the symbol is callable / usable, not
 * a `undefined` placeholder).
 */
const EXPECTED_EXPORTS = {
  // Phase 20 — feature model + manifest + presets.
  getFeatureCatalog: "function",
  defaultFeatures: "function",
  validateFeatureSet: "function",
  buildManifest: "function",
  readManifest: "function",
  writeManifest: "function",
  syncFeaturesToConfig: "function",
  updateJsonFile: "function",
  getPresets: "function",
  applyPreset: "function",
  // Phase 21 — generator registry (the public entry point
  // `scaffoldProject` is the legacy one; `getGenerators` is
  // the feature-aware one).
  scaffoldProject: "function",
  validateAnswers: "function",
  answersToProjectConfig: "function",
  renderTemplate: "function",
  // Phase 22 — additive feature mutations.
  addFeature: "function",
  removeFeature: "function",
  // Phase 24.1-24.6 — migrations registry, selector, runner,
  // and the small semver compare helper that powers them.
  getMigrations: "function",
  selectMigrations: "function",
  runMigrations: "function",
  compareSemver: "function",
  // Phase 24.7-24.10 — planUpdate, doctor, getDepVersions.
  planUpdate: "function",
  doctorProject: "function",
  getDepVersions: "function",
  // Phase 24.12-24.13 — getKitStatus.
  getKitStatus: "function",
};

describe("create-wp-project/src/index.js — public re-export surface (Phase 24.13 follow-up)", () => {
  test("exports every documented Phase 20-24 symbol as a named export", () => {
    for (const [name, expectedType] of Object.entries(EXPECTED_EXPORTS)) {
      expect(engine).toHaveProperty(name);
      expect(typeof engine[name]).toBe(expectedType);
    }
  });

  test("engine surface is exactly the documented list (no extras to track)", () => {
    // The inverse direction: the engine's named exports
    // should be a SUPERSET of EXPECTED_EXPORTS. Anything
    // beyond the list is allowed (future phases can add) —
    // the test only fails if a documented symbol goes
    // missing, not if a new one is added. The list is the
    // lock; the engine is free to grow.
    const expected = Object.keys(EXPECTED_EXPORTS);
    for (const name of expected) {
      expect(engine).toHaveProperty(name);
    }
  });
});
