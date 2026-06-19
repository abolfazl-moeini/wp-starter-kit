import { describe, test, expect } from "@jest/globals";

import {
  deriveBrandingDefaults,
  fillDerivedBranding,
  needsGlobalNamePrompt,
  slugToPhpFunctionPrefix,
  slugToGlobalName,
} from "../../packages/cli/src/branding.js";

describe("deriveBrandingDefaults()", () => {
  test("uses sanitized directory basename for slug and textDomain", () => {
    const d = deriveBrandingDefaults("my-sample-plugin");
    expect(d.slug).toBe("my-sample-plugin");
    expect(d.textDomain).toBe("my-sample-plugin");
    expect(d.npmScope).toBe("my-sample-plugin");
    expect(d.globalName).toBe("MySamplePlugin");
    expect(d.phpFunctionPrefix).toBe("my_sample_plugin_");
  });

  test("falls back when basename sanitizes to empty", () => {
    const d = deriveBrandingDefaults("!!!");
    expect(d.slug).toBe("my-plugin");
    expect(d.textDomain).toBe("my-plugin");
  });
});

describe("fillDerivedBranding()", () => {
  test("defaults npmScope and hookPrefix from slug when missing", () => {
    const answers = { slug: "my-sample-plugin" };
    fillDerivedBranding(answers);
    expect(answers.npmScope).toBe("my-sample-plugin");
    expect(answers.hookPrefix).toBe("my-sample-plugin");
    expect(answers.globalName).toBe("MySamplePlugin");
    expect(answers.textDomain).toBe("my-sample-plugin");
    expect(answers.phpFunctionPrefix).toBe("my_sample_plugin_");
  });

  test("keeps explicit npmScope for hookPrefix", () => {
    const answers = { slug: "my-sample-plugin", npmScope: "acme" };
    fillDerivedBranding(answers);
    expect(answers.hookPrefix).toBe("acme");
  });
});

describe("slugToPhpFunctionPrefix()", () => {
  test("replaces dashes with underscores and adds trailing underscore", () => {
    expect(slugToPhpFunctionPrefix("my-sample-plugin")).toBe(
      "my_sample_plugin_",
    );
    expect(slugToPhpFunctionPrefix("acme-brand")).toBe("acme_brand_");
  });
});

describe("needsGlobalNamePrompt()", () => {
  test("returns false for minimal preset (PHP-only)", () => {
    expect(
      needsGlobalNamePrompt(
        { runOptions: { preset: "minimal" }, features: {} },
        { applyPreset: (id) => (id === "minimal" ? { js: "none" } : {}) },
      ),
    ).toBe(false);
  });

  test("returns true when JS is enabled", () => {
    expect(
      needsGlobalNamePrompt(
        { runOptions: { preset: "standard" }, features: {} },
        {
          applyPreset: (id) =>
            id === "standard" ? { js: "typescript", jsLib: "preact" } : {},
        },
      ),
    ).toBe(true);
  });
});

describe("slugToGlobalName()", () => {
  test("converts kebab-case to PascalCase", () => {
    expect(slugToGlobalName("my-sample-plugin")).toBe("MySamplePlugin");
  });
});
