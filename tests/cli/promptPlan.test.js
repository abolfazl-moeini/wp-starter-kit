import { describe, test, expect } from "@jest/globals";

import { buildPromptPlan } from "../../packages/cli/src/prompts.js";
import { defaultFeatures } from "@wpsk/create-wp-project";

/**
 * Helper: extract the ids from a plan. Branding questions have ids
 * from the BRANDING_QUESTIONS array; feature questions have ids
 * that match the catalog.
 */
function planIds(plan) {
  return plan.map((q) => q.id);
}

describe("buildPromptPlan() — conditional omissions (I2.5)", () => {
  test("default plan includes every branding question first", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    // Branding ids are at the front, in the order they appear in
    // BRANDING_QUESTIONS.
    expect(ids.slice(0, 6)).toEqual([
      "slug",
      "npmScope",
      "globalName",
      "textDomain",
      "hookPrefix",
      "phpFunctionPrefix",
    ]);
  });

  test("default plan includes every feature question (no omissions)", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    // phpSourceVersion is an `answers` field (per plan §1.0) so it
    // is asked in the branding pass, not in the feature pass. We
    // therefore do NOT expect it here.
    for (const id of [
      "js",
      "jsLib",
      "jsTest",
      "css",
      "blocks",
      "phpMinVersion",
      "phpFramework",
      "phpTest",
      "license",
      "wpMinVersion",
      "restBatch",
      "faultTolerance",
      "vendorScoping",
      "husky",
      "exampleFeature",
      "i18n",
      "frontendStack",
    ]) {
      expect(ids).toContain(id);
    }
  });

  test("frontendStack prompt only when js=typescript and jsLib is react/preact", () => {
    const plan = buildPromptPlan({ js: "typescript" });
    const q = plan.find((item) => item.id === "frontendStack");
    expect(q).toBeDefined();
    expect(q.when({ features: { js: "typescript", jsLib: "preact" } })).toBe(
      true,
    );
    expect(q.when({ features: { js: "typescript", jsLib: "none" } })).toBe(
      false,
    );
    expect(q.when({ features: { js: "pure", jsLib: "preact" } })).toBe(false);
  });

  test("when js=none, omits jsLib, jsTest, css, blocks at plan-time via when()", () => {
    // The plan is a static list. Conditional omission is enforced
    // by the `when()` callback at runtime (runPrompts evaluates it
    // with the running state). We assert the `when()` predicate
    // directly here.
    const plan = buildPromptPlan({ js: "none" });
    const findQ = (id) => plan.find((q) => q.id === id);
    expect(findQ("jsLib").when({ features: { js: "none" } })).toBe(false);
    expect(findQ("jsTest").when({ features: { js: "none" } })).toBe(false);
    expect(findQ("css").when({ features: { js: "none" } })).toBe(false);
    expect(findQ("blocks").when({ features: { js: "none" } })).toBe(false);
  });

  test("when js=typescript, includes jsLib, jsTest, css, blocks", () => {
    const plan = buildPromptPlan({ js: "typescript" });
    const findQ = (id) => plan.find((q) => q.id === id);
    expect(findQ("jsLib").when({ features: { js: "typescript" } })).toBe(true);
    expect(findQ("jsTest").when({ features: { js: "typescript" } })).toBe(true);
    expect(findQ("css").when({ features: { js: "typescript" } })).toBe(true);
    expect(findQ("blocks").when({ features: { js: "typescript" } })).toBe(true);
  });

  test("when phpMinVersion < 8.1, omits faultTolerance via when()", () => {
    const plan = buildPromptPlan({ phpMinVersion: "7.4" });
    const findQ = (id) => plan.find((q) => q.id === id);
    expect(
      findQ("faultTolerance").when({ features: { phpMinVersion: "7.4" } }),
    ).toBe(false);
    expect(
      findQ("faultTolerance").when({ features: { phpMinVersion: "8.0" } }),
    ).toBe(false);
    expect(
      findQ("faultTolerance").when({ features: { phpMinVersion: "8.1" } }),
    ).toBe(true);
    expect(
      findQ("faultTolerance").when({ features: { phpMinVersion: "8.2" } }),
    ).toBe(true);
  });
});

describe("buildPromptPlan() — preset short-circuit (I2.6)", () => {
  test("when preset is 'full' (or any non-custom), no per-feature questions are added", () => {
    // The marker for "preset was chosen" is the `__preset` slot on
    // the state. gatherInputs.js sets it before calling
    // buildPromptPlan. We mirror that here.
    const plan = buildPromptPlan({ __preset: "full" });
    const ids = planIds(plan);
    // Branding questions are still present (preset doesn't pin them).
    expect(ids).toContain("slug");
    expect(ids).toContain("npmScope");
    // No feature questions at all.
    for (const id of [
      "js",
      "jsLib",
      "css",
      "blocks",
      "license",
      "wpMinVersion",
    ]) {
      expect(ids).not.toContain(id);
    }
  });

  test("when preset is 'woocommerce' or 'minimal', still no per-feature questions", () => {
    for (const p of ["woocommerce", "minimal"]) {
      const plan = buildPromptPlan({ __preset: p });
      const ids = planIds(plan);
      expect(ids).not.toContain("js");
      expect(ids).not.toContain("license");
    }
  });

  test("when preset is unset / 'custom', all features are asked", () => {
    const plan = buildPromptPlan({ __preset: "custom" });
    const ids = planIds(plan);
    expect(ids).toContain("js");
    expect(ids).toContain("license");
  });
});

describe("buildPromptPlan() — branding comes before features (I2.6)", () => {
  test("every branding question precedes every feature question", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    const lastBrandingIndex = ids.indexOf("phpFunctionPrefix");
    const firstFeatureIndex = ids.indexOf("js");
    expect(lastBrandingIndex).toBeGreaterThanOrEqual(0);
    expect(firstFeatureIndex).toBeGreaterThan(lastBrandingIndex);
  });
});
