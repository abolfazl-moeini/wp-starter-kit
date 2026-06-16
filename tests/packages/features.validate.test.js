import { describe, test, expect } from "@jest/globals";
import {
  validateFeatureSet,
  defaultFeatures,
} from "../../packages/create-wp-project/src/features.js";

/**
 * Phase 20.3 / 20.4 — validateFeatureSet() — the rules in
 * plan.v3.md §1.1. Every test in this file corresponds to one
 * rule in §1.1. The structure of the suite mirrors the plan so
 * a future reviewer can diff the rules against the test names.
 *
 * Shape errors (missing fields, unknown ids, bad variants) are
 * covered first because the dependency rules assume a well-formed
 * set. The split mirrors the implementation in features.js.
 */
describe("validateFeatureSet — shape (Phase 20.3/20.4)", () => {
  test("null/undefined/non-object → { ok:false, errors._root }", () => {
    expect(validateFeatureSet(null).ok).toBe(false);
    expect(validateFeatureSet(undefined).ok).toBe(false);
    expect(validateFeatureSet("nope").ok).toBe(false);
    expect(validateFeatureSet(42).ok).toBe(false);
    const r = validateFeatureSet(null);
    expect(r.errors._root).toBeDefined();
  });

  test("missing required feature → error keyed on that id", () => {
    const rest = { ...defaultFeatures() };
    delete rest.js;
    const r = validateFeatureSet(rest);
    expect(r.ok).toBe(false);
    expect(r.errors.js).toBeDefined();
  });

  test("unknown variant on a known feature → error", () => {
    const f = { ...defaultFeatures(), js: "rust" };
    const r = validateFeatureSet(f);
    expect(r.ok).toBe(false);
    expect(r.errors.js).toMatch(/not a known variant/);
  });

  test("unknown feature id → error keyed on the unknown id", () => {
    const f = { ...defaultFeatures(), futureFeature: "yes" };
    const r = validateFeatureSet(f);
    expect(r.ok).toBe(false);
    expect(r.errors.futureFeature).toBeDefined();
  });

  test("the all-default feature set is valid", () => {
    const r = validateFeatureSet(defaultFeatures());
    // Phase 25.G2: validateFeatureSet also returns `warnings`
    // (advisory only — license=mit triggers a warning, but the
    // default `license:gpl2` is GPL-compatible so no warning fires).
    // Use toMatchObject so the new shape doesn't break this
    // locked test.
    expect(r).toMatchObject({ ok: true, errors: {} });
  });
});

/* -------------------------------------------------------------------- */
/* §1.1 rule 1 — jsLib / jsTest / restBatch / css require js ≠ none     */
/* -------------------------------------------------------------------- */

describe("validateFeatureSet — §1.1 rule 1 (js ≠ none for dependents)", () => {
  test("jsLib:preact + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsLib: "preact",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.jsLib).toMatch(/requires js ≠ none/);
  });

  test("jsLib:react + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsLib: "react",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.jsLib).toMatch(/requires js ≠ none/);
  });

  test("jsLib:none + js:none → no error (none is a no-op)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsLib: "none",
    });
    expect(r.errors?.jsLib).toBeUndefined();
  });

  test("jsLib:preact + js:typescript → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "typescript",
      jsLib: "preact",
    });
    expect(r.errors?.jsLib).toBeUndefined();
  });

  test("jsTest:vitest + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsTest: "vitest",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.jsTest).toMatch(/requires js ≠ none/);
  });

  test("jsTest:jest + js:flow → no error (flow is still a real js)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "flow",
      jsTest: "jest",
    });
    expect(r.errors?.jsTest).toBeUndefined();
  });

  test("restBatch:on + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      restBatch: "on",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.restBatch).toMatch(/requires js ≠ none/);
  });

  test("restBatch:off + js:none → no error (off is a no-op)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      restBatch: "off",
    });
    expect(r.errors?.restBatch).toBeUndefined();
  });

  test("css:sass + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      css: "sass",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.css).toMatch(/requires js ≠ none/);
  });

  test("css:tailwind + js:none → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      css: "tailwind",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.css).toMatch(/requires js ≠ none/);
  });

  test("css:none + js:none → no error (none is a no-op)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      css: "none",
    });
    expect(r.errors?.css).toBeUndefined();
  });

  test("css:sass + js:pure → no error (pure is still a real js)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "pure",
      css: "sass",
    });
    expect(r.errors?.css).toBeUndefined();
  });
});

/* -------------------------------------------------------------------- */
/* §1.1 rule 2 — faultTolerance:on requires phpMinVersion ≥ 8.1         */
/* -------------------------------------------------------------------- */

describe("validateFeatureSet — §1.1 rule 2 (faultTolerance + phpMinVersion)", () => {
  test("faultTolerance:on + phpMinVersion:8.0 → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.0",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.faultTolerance).toMatch(/phpMinVersion ≥ 8\.1/);
  });

  test("faultTolerance:on + phpMinVersion:7.4 → error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "7.4",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.faultTolerance).toMatch(/phpMinVersion ≥ 8\.1/);
  });

  test("faultTolerance:on + phpMinVersion:8.1 → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.1",
    });
    expect(r.errors?.faultTolerance).toBeUndefined();
  });

  test("faultTolerance:on + phpMinVersion:8.2 → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.2",
    });
    expect(r.errors?.faultTolerance).toBeUndefined();
  });

  test("faultTolerance:on + phpMinVersion:8.3 → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.3",
    });
    expect(r.errors?.faultTolerance).toBeUndefined();
  });

  test("faultTolerance:on + phpMinVersion:8.1.0 → no error (X.Y.Z is ≥ 8.1)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "on",
      phpMinVersion: "8.1.0",
    });
    expect(r.errors?.faultTolerance).toBeUndefined();
  });

  test("faultTolerance:off + phpMinVersion:7.4 → no error (off skips the rule)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      faultTolerance: "off",
      phpMinVersion: "7.4",
    });
    expect(r.errors?.faultTolerance).toBeUndefined();
  });
});

/* -------------------------------------------------------------------- */
/* §1.1 rule 3 — blocks:on requires js ≠ none AND wpMinVersion ≥ 5.8     */
/* -------------------------------------------------------------------- */

describe("validateFeatureSet — §1.1 rule 3 (blocks + js + wpMinVersion)", () => {
  test("blocks:on + js:none → error (regardless of wpMinVersion)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      blocks: "on",
      wpMinVersion: "6.0",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.blocks).toMatch(/requires js ≠ none/);
  });

  test("blocks:on + js:typescript + wpMinVersion:6.0 → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "typescript",
      blocks: "on",
      wpMinVersion: "6.0",
    });
    expect(r.errors?.blocks).toBeUndefined();
  });

  test("blocks:on + js:pure + wpMinVersion:5.8 → no error (boundary)", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "pure",
      blocks: "on",
      wpMinVersion: "5.8",
    });
    expect(r.errors?.blocks).toBeUndefined();
  });

  test("blocks:on + js:flow + wpMinVersion:5.8.0 → no error", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "flow",
      blocks: "on",
      wpMinVersion: "5.8.0",
    });
    expect(r.errors?.blocks).toBeUndefined();
  });

  test("blocks:off → no error regardless of js / wpMinVersion", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      blocks: "off",
      wpMinVersion: "5.8",
    });
    expect(r.errors?.blocks).toBeUndefined();
  });
});

/* -------------------------------------------------------------------- */
/* Pure-function contract                                                */
/* -------------------------------------------------------------------- */

describe("validateFeatureSet — pure function contract", () => {
  test("does not mutate the input object", () => {
    const f = defaultFeatures();
    const before = JSON.stringify(f);
    validateFeatureSet(f);
    expect(JSON.stringify(f)).toBe(before);
  });

  test("returns a fresh errors object on every call (no shared state)", () => {
    const f = { ...defaultFeatures(), js: "rust" }; // shape error
    const a = validateFeatureSet(f);
    const b = validateFeatureSet(f);
    expect(a.errors).not.toBe(b.errors);
    expect(a.errors).toEqual(b.errors);
  });
});
