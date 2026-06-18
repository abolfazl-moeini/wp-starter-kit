import { describe, test, expect } from "@jest/globals";
import {
  getFeatureCatalog,
  defaultFeatures,
} from "../../packages/create-wp-project/src/features.js";

/**
 * Phase 20.1 / 20.2 — feature catalog (the data model for v3).
 *
 * The catalog is the single source of truth for every feature the
 * installer + generators know about. Two contracts are locked here:
 *
 *  1. Every feature id from plan.v3.md §1 is present, in the
 *     documented order, with the documented variants.
 *  2. The FIRST variant of every feature is the default, and
 *     `defaultFeatures()` returns the all-default feature set.
 *
 * Anything else (validation rules, manifest shape, presets) is
 * covered by the sibling test files. Keep this file scoped to
 * the catalog + defaults.
 */
describe("getFeatureCatalog() — feature data model (Phase 20.1/20.2)", () => {
  test("returns a non-empty array", () => {
    const catalog = getFeatureCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(0);
  });

  test("contains every feature id from plan.v3.md §1", () => {
    const ids = getFeatureCatalog().map((f) => f.id);
    const expected = [
      "js",
      "jsLib",
      "jsTest",
      "phpMinVersion",
      "phpFramework",
      "phpTest",
      "restBatch",
      "faultTolerance",
      "vendorScoping",
      "husky",
      "css",
      "blocks",
      "license",
      "wpMinVersion",
      "exampleFeature",
      "i18n",
      "frontendStack",
      "mcpAbilities",
      "ci",
    ];
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });

  test("every feature has at least one variant", () => {
    for (const f of getFeatureCatalog()) {
      expect(Array.isArray(f.variants)).toBe(true);
      expect(f.variants.length).toBeGreaterThan(0);
    }
  });

  test("first variant of every feature is the default (per plan §1)", () => {
    // The §1 table documents the order of variants as "first = default".
    // A regression here means the installer will silently ship a
    // non-default set when the user accepts all defaults.
    const expectations = {
      js: "typescript",
      jsLib: "none",
      jsTest: "jest",
      phpMinVersion: "7.4",
      phpFramework: "none",
      phpTest: "phpunit",
      restBatch: "off",
      faultTolerance: "off",
      vendorScoping: "on",
      husky: "on",
      css: "none",
      blocks: "off",
      license: "gpl2",
      wpMinVersion: "6.0",
      exampleFeature: "on",
      i18n: "on",
    };
    const catalog = getFeatureCatalog();
    for (const [id, firstVariant] of Object.entries(expectations)) {
      const feature = catalog.find((f) => f.id === id);
      expect(feature).toBeDefined();
      expect(feature.variants[0]).toBe(firstVariant);
    }
  });

  test("specific feature/variant sets match plan.v3.md §1 verbatim", () => {
    const byId = Object.fromEntries(getFeatureCatalog().map((f) => [f.id, f]));
    expect(byId.js.variants).toEqual(["typescript", "pure", "flow", "none"]);
    expect(byId.jsLib.variants).toEqual(["none", "preact", "react"]);
    expect(byId.jsTest.variants).toEqual(["jest", "vitest", "none"]);
    expect(byId.phpMinVersion.variants).toEqual([
      "7.4",
      "8.0",
      "8.1",
      "8.2",
      "8.3",
    ]);
    expect(byId.phpFramework.variants).toEqual(["none", "wpdev"]);
    expect(byId.phpTest.variants).toEqual(["phpunit", "none"]);
    expect(byId.restBatch.variants).toEqual(["off", "on"]);
    expect(byId.faultTolerance.variants).toEqual(["off", "on"]);
    expect(byId.vendorScoping.variants).toEqual(["on", "off"]);
    expect(byId.husky.variants).toEqual(["on", "off"]);
    expect(byId.css.variants).toEqual(["none", "sass", "tailwind", "postcss"]);
    expect(byId.blocks.variants).toEqual(["off", "on"]);
    expect(byId.license.variants).toEqual(["gpl2", "gpl3", "mit"]);
    expect(byId.wpMinVersion.variants).toEqual([
      "6.0",
      "5.8",
      "6.2",
      "6.4",
      "6.6",
    ]);
    expect(byId.exampleFeature.variants).toEqual(["on", "off"]);
    expect(byId.i18n.variants).toEqual(["on", "off"]);
    expect(byId.frontendStack.variants).toEqual(["none", "polaris"]);
    expect(byId.mcpAbilities.variants).toEqual(["off", "on"]);
    expect(byId.ci.variants).toEqual(["auto", "off"]);
  });

  test("feature descriptors carry an id, variants, and a default (variant[0])", () => {
    for (const f of getFeatureCatalog()) {
      expect(typeof f.id).toBe("string");
      expect(f.id.length).toBeGreaterThan(0);
      // `default` is the helper field the installer can use; must
      // mirror variants[0] so the data is internally consistent.
      expect(f.default).toBe(f.variants[0]);
    }
  });
});

describe("defaultFeatures() — all-default feature set (Phase 20.2)", () => {
  test("returns one entry per catalog id, value = first variant", () => {
    const defaults = defaultFeatures();
    const catalog = getFeatureCatalog();
    expect(Object.keys(defaults).sort()).toEqual(
      catalog.map((f) => f.id).sort(),
    );
    for (const f of catalog) {
      expect(defaults[f.id]).toBe(f.variants[0]);
    }
  });

  test("returns a fresh object on each call (no shared mutation)", () => {
    const a = defaultFeatures();
    const b = defaultFeatures();
    expect(a).not.toBe(b);
    a.js = "none";
    expect(b.js).toBe("typescript");
  });

  test("defaultFeatures() result matches plan.v3.md §1 (first variant per feature)", () => {
    // Source of truth: plan.v3.md §1 table, which states
    // "first = default" for every feature row. The `wpdev-kit.json`
    // example in plan.v3.md §Phase 20 has `jsLib: "preact"` and
    // `restBatch: "on"` but those conflict with §1's
    // `jsLib: none, preact, react` and `restBatch: off, on` — the
    // table is the contract.
    expect(defaultFeatures()).toEqual({
      js: "typescript",
      jsLib: "none",
      jsTest: "jest",
      phpMinVersion: "7.4",
      phpFramework: "none",
      phpTest: "phpunit",
      restBatch: "off",
      faultTolerance: "off",
      vendorScoping: "on",
      husky: "on",
      css: "none",
      blocks: "off",
      license: "gpl2",
      wpMinVersion: "6.0",
      exampleFeature: "on",
      i18n: "on",
      frontendStack: "none",
      mcpAbilities: "off",
      ci: "auto",
    });
  });
});
