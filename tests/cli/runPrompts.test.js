import { describe, test, expect } from "@jest/globals";

import { buildPromptPlan, runPrompts } from "../../packages/cli/src/prompts.js";
import {
  defaultFeatures,
  getFeatureCatalog,
  applyPreset,
} from "@wpdev/create-wp-project";
import { deriveBrandingDefaults } from "../../packages/cli/src/branding.js";

function makeUi(responses) {
  let textIdx = 0;
  let selectIdx = 0;
  return {
    text: async (opts) => {
      if (responses.text && responses.text[textIdx] !== undefined) {
        return responses.text[textIdx++];
      }
      return opts.defaultValue ?? "";
    },
    select: async (opts) => {
      if (responses.select && responses.select[selectIdx] !== undefined) {
        return responses.select[selectIdx++];
      }
      return opts.initialValue ?? opts.options[0]?.value;
    },
    confirm: async () => false,
    log: async () => {},
  };
}

describe("runPrompts() — branding defaults", () => {
  test("accepts Enter on slug by applying defaultValue before validate", async () => {
    const plan = buildPromptPlan(
      { __preset: "minimal" },
      { getFeatureCatalog, applyPreset },
      { dirBasename: "my-sample-plugin" },
    );
    const ui = makeUi({
      text: ["", "", "", ""],
      select: ["7.4"],
    });
    const out = await runPrompts(plan, ui, {
      brandingDefaults: deriveBrandingDefaults("my-sample-plugin"),
      runOptions: { preset: "minimal" },
      phpSourceVersionOptions: {
        versions: ["8.1"],
        defaultVersion: "7.4",
        options: [
          { label: "8.1", value: "8.1" },
          { label: "Other (type a version)", value: "__other__" },
        ],
      },
    });
    expect(out.answers.slug).toBe("my-sample-plugin");
  });

  test("passes defaultValue from directory basename to slug prompt", () => {
    const plan = buildPromptPlan(defaultFeatures(), undefined, {
      dirBasename: "my-sample-plugin",
    });
    const slugQ = plan.find((q) => q.id === "slug");
    expect(slugQ.defaultValue).toBe("my-sample-plugin");
    expect(slugQ.placeholder).toBe("my-sample-plugin");
  });

  test("derives phpFunctionPrefix from slug (dashes to underscores)", async () => {
    const plan = buildPromptPlan(
      { __preset: "minimal" },
      { getFeatureCatalog, applyPreset },
      { dirBasename: "my-sample-plugin" },
    );
    const ui = makeUi({
      text: ["", "acme-brand", "", ""],
      select: ["7.4"],
    });
    const out = await runPrompts(plan, ui, {
      brandingDefaults: deriveBrandingDefaults("my-sample-plugin"),
      runOptions: { preset: "minimal" },
      phpSourceVersionOptions: {
        versions: ["8.1"],
        defaultVersion: "7.4",
        options: [
          { label: "8.1", value: "8.1" },
          { label: "Other (type a version)", value: "__other__" },
        ],
      },
    });
    expect(out.answers.phpFunctionPrefix).toBe("my_sample_plugin_");
  });

  test("does not ask hookPrefix; derives it from npmScope", async () => {
    const plan = buildPromptPlan({ __preset: "minimal" }, undefined, {
      dirBasename: "my-sample-plugin",
    });
    expect(planIds(plan)).not.toContain("hookPrefix");

    const ui = makeUi({
      select: ["7.4"],
      text: ["", "acme", "", ""],
    });
    const out = await runPrompts(plan, ui, {
      brandingDefaults: {
        slug: "my-sample-plugin",
        textDomain: "my-sample-plugin",
        globalName: "MySamplePlugin",
        phpFunctionPrefix: "my_sample_plugin_",
        npmScope: "my-sample-plugin",
      },
      runOptions: { preset: "minimal" },
    });
    expect(out.answers.slug).toBe("my-sample-plugin");
    expect(out.answers.npmScope).toBe("acme");
    expect(out.answers.hookPrefix).toBe("acme");
    expect(out.answers.textDomain).toBe("my-sample-plugin");
    expect(out.answers.globalName).toBe("MySamplePlugin");
  });

  test("skips globalName prompt for minimal preset", () => {
    const plan = buildPromptPlan(
      { __preset: "minimal" },
      { getFeatureCatalog, applyPreset },
    );
    const globalQ = plan.find((q) => q.id === "globalName");
    expect(
      globalQ.when({
        runOptions: { preset: "minimal" },
        features: {},
        answers: {},
      }),
    ).toBe(false);
  });
});

function planIds(plan) {
  return plan.map((q) => q.id);
}
