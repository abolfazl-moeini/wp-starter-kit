import { describe, test, expect } from "@jest/globals";

import { buildPromptPlan } from "../../packages/cli/src/prompts.js";
import { defaultFeatures } from "@wpdev/create-wp-project";

/**
 * Helper: extract the ids from a plan. Branding questions have ids
 * from the BRANDING_QUESTIONS array; feature questions have ids
 * that match the catalog.
 */
function planIds(plan) {
  return plan.map((q) => q.id);
}

describe("buildPromptPlan() — interactive preset picker (G-001)", () => {
  test("when no --preset flag, the first question is preset", () => {
    const plan = buildPromptPlan(defaultFeatures());
    expect(planIds(plan)[0]).toBe("preset");
  });

  test("choosing minimal skips feature questions; custom includes them", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const presetQ = plan.find((q) => q.id === "preset");
    expect(presetQ).toBeDefined();
    const stateMinimal = { runOptions: { preset: "minimal" }, features: {} };
    const stateCustom = { runOptions: { preset: "custom" }, features: {} };
    expect(plan.find((q) => q.id === "js").when(stateMinimal)).toBe(false);
    expect(plan.find((q) => q.id === "js").when(stateCustom)).toBe(true);
  });

  test("when __preset is set from --preset= flag, preset question is omitted", () => {
    const plan = buildPromptPlan({ __preset: "full" });
    expect(planIds(plan)).not.toContain("preset");
  });
});

describe("buildPromptPlan() — conditional omissions (I2.5)", () => {
  test("default plan includes every branding question after preset", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    expect(ids[0]).toBe("preset");
    // Branding ids follow the preset question.
    expect(ids.slice(1, 7)).toEqual([
      "slug",
      "npmScope",
      "globalName",
      "textDomain",
      "phpFunctionPrefix",
      "phpSourceVersion",
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
      "mcpAbilities",
    ]) {
      expect(ids).toContain(id);
    }
  });

  test("mcpAbilities prompt is always available (no js gate)", () => {
    const plan = buildPromptPlan({ js: "none" });
    const q = plan.find((item) => item.id === "mcpAbilities");
    const custom = { runOptions: { preset: "custom" }, features: {} };
    expect(q).toBeDefined();
    expect(q.when({ ...custom, features: { js: "none" } })).toBe(true);
    expect(q.when({ ...custom, features: { js: "typescript" } })).toBe(true);
  });

  test("frontendStack prompt only when js=typescript and jsLib is react/preact", () => {
    const plan = buildPromptPlan({ js: "typescript" });
    const q = plan.find((item) => item.id === "frontendStack");
    const custom = { runOptions: { preset: "custom" }, features: {} };
    expect(q).toBeDefined();
    expect(
      q.when({ ...custom, features: { js: "typescript", jsLib: "preact" } }),
    ).toBe(true);
    expect(
      q.when({ ...custom, features: { js: "typescript", jsLib: "none" } }),
    ).toBe(false);
    expect(
      q.when({ ...custom, features: { js: "pure", jsLib: "preact" } }),
    ).toBe(false);
  });

  test("when js=none, omits jsLib, jsTest, css, restBatch but still asks blocks", () => {
    const plan = buildPromptPlan({ js: "none" });
    const findQ = (id) => plan.find((q) => q.id === id);
    const custom = {
      runOptions: { preset: "custom" },
      features: { js: "none" },
    };
    expect(findQ("jsLib").when(custom)).toBe(false);
    expect(findQ("jsTest").when(custom)).toBe(false);
    expect(findQ("css").when(custom)).toBe(false);
    expect(findQ("restBatch").when(custom)).toBe(false);
    expect(findQ("blocks").when(custom)).toBe(true);
  });

  test("when js=typescript, includes jsLib, jsTest, css, restBatch", () => {
    const plan = buildPromptPlan({ js: "typescript" });
    const findQ = (id) => plan.find((q) => q.id === id);
    const custom = {
      runOptions: { preset: "custom" },
      features: { js: "typescript" },
    };
    expect(findQ("jsLib").when(custom)).toBe(true);
    expect(findQ("jsTest").when(custom)).toBe(true);
    expect(findQ("css").when(custom)).toBe(true);
    expect(findQ("restBatch").when(custom)).toBe(true);
  });

  test("blocks prompt is always available and mentions Blockstudio", () => {
    const plan = buildPromptPlan({});
    const blocksQ = plan.find((q) => q.id === "blocks");
    const custom = { runOptions: { preset: "custom" }, features: {} };
    expect(blocksQ).toBeDefined();
    expect(blocksQ.message).toMatch(/Blockstudio/i);
    expect(blocksQ.when({ ...custom, features: { js: "none" } })).toBe(true);
  });

  test("when phpMinVersion < 8.1, omits faultTolerance via when()", () => {
    const plan = buildPromptPlan({ phpMinVersion: "7.4" });
    const findQ = (id) => plan.find((q) => q.id === id);
    const custom = { runOptions: { preset: "custom" }, features: {} };
    expect(
      findQ("faultTolerance").when({
        ...custom,
        features: { phpMinVersion: "7.4" },
      }),
    ).toBe(false);
    expect(
      findQ("faultTolerance").when({
        ...custom,
        features: { phpMinVersion: "8.0" },
      }),
    ).toBe(false);
    expect(
      findQ("faultTolerance").when({
        ...custom,
        features: { phpMinVersion: "8.1" },
      }),
    ).toBe(true);
    expect(
      findQ("faultTolerance").when({
        ...custom,
        features: { phpMinVersion: "8.2" },
      }),
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

  test("when preset is 'woocommerce', still no per-feature questions", () => {
    const plan = buildPromptPlan({ __preset: "woocommerce" });
    const ids = planIds(plan);
    expect(ids).not.toContain("js");
    expect(ids).not.toContain("license");
  });

  test("when preset is 'minimal', asks phpTest but skips other features", () => {
    const plan = buildPromptPlan({ __preset: "minimal" });
    const ids = planIds(plan);
    expect(ids).toContain("phpTest");
    expect(ids).not.toContain("js");
    expect(ids).not.toContain("license");
    const phpTestQ = plan.find((q) => q.id === "phpTest");
    expect(phpTestQ.options).toEqual([
      { label: "Yes", value: "phpunit" },
      { label: "No", value: "none" },
    ]);
  });

  test("when preset is unset / 'custom', all features are asked", () => {
    const plan = buildPromptPlan({ __preset: "custom" });
    const ids = planIds(plan);
    expect(ids).toContain("js");
    expect(ids).toContain("license");
  });
});

describe("buildPromptPlan() — dynamic PHP source versions", () => {
  test("phpSourceVersion select includes fetched options and Other", () => {
    const phpSourceVersionOptions = {
      versions: ["7.4", "8.0", "8.1"],
      defaultVersion: "7.4",
      options: [
        { label: "7.4", value: "7.4" },
        { label: "8.0", value: "8.0" },
        { label: "8.1", value: "8.1" },
        { label: "Other (type a version)", value: "__other__" },
      ],
    };
    const plan = buildPromptPlan(defaultFeatures(), undefined, {
      phpSourceVersionOptions,
    });
    const q = plan.find((item) => item.id === "phpSourceVersion");
    expect(q.options).toEqual(phpSourceVersionOptions.options);
    expect(q.initialValue).toBe("7.4");
  });
});

describe("buildPromptPlan() — branding comes before features (I2.6)", () => {
  test("preset precedes branding; every branding question precedes every feature question", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    expect(ids.indexOf("preset")).toBe(0);
    const lastBrandingIndex = ids.indexOf("phpSourceVersion");
    const firstFeatureIndex = ids.indexOf("js");
    expect(lastBrandingIndex).toBeGreaterThanOrEqual(0);
    expect(firstFeatureIndex).toBeGreaterThan(lastBrandingIndex);
  });
});

describe("buildPromptPlan() — JS variant matrix order (TASK-24b)", () => {
  test("asks js → jsLib → jsTest → phpMinVersion → phpFramework before optional toggles", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const ids = planIds(plan);
    const js = ids.indexOf("js");
    const jsLib = ids.indexOf("jsLib");
    const jsTest = ids.indexOf("jsTest");
    const phpMin = ids.indexOf("phpMinVersion");
    const phpFramework = ids.indexOf("phpFramework");

    expect(js).toBeGreaterThanOrEqual(0);
    expect(js).toBeLessThan(jsLib);
    expect(jsLib).toBeLessThan(jsTest);
    expect(jsTest).toBeLessThan(phpMin);
    expect(phpMin).toBeLessThan(phpFramework);

    for (const optionalId of [
      "blocks",
      "husky",
      "i18n",
      "faultTolerance",
      "mcpAbilities",
    ]) {
      expect(ids.indexOf(optionalId)).toBeGreaterThan(phpFramework);
    }
  });

  test("feature prompts have human-readable messages", () => {
    const plan = buildPromptPlan(defaultFeatures());
    const jsQ = plan.find((q) => q.id === "js");
    const phpMinQ = plan.find((q) => q.id === "phpMinVersion");
    expect(jsQ.message).toMatch(/JavaScript/i);
    expect(phpMinQ.message).toMatch(/PHP/i);
  });
});
