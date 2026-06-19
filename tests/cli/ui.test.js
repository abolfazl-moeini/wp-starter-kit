import { describe, test, expect } from "@jest/globals";

import { humanizeValidationErrors } from "../../packages/cli/src/ui.js";
import { getFeatureCatalog } from "../../packages/create-wp-project/src/features.js";

const catalog = getFeatureCatalog();

describe("humanizeValidationErrors()", () => {
  test("replaces jsLib and js with human labels", () => {
    const result = humanizeValidationErrors(
      {
        errors: { jsLib: "jsLib requires js to be enabled" },
        warnings: {},
      },
      catalog,
    );
    expect(result.errors[0]).toContain("JavaScript Library");
    expect(result.errors[0]).toContain("JavaScript");
    expect(result.errors[0]).not.toMatch(/\bjsLib\b/);
  });

  test("replaces faultTolerance and phpMinVersion with human labels", () => {
    const result = humanizeValidationErrors(
      {
        errors: {
          faultTolerance: "faultTolerance requires phpMinVersion >= 8.1",
        },
        warnings: {},
      },
      catalog,
    );
    expect(result.errors[0]).toContain("Fault Tolerance");
    expect(result.errors[0]).toContain("PHP");
  });

  test("falls back to raw id when label is missing", () => {
    const sparse = [{ id: "customFeature" }];
    const result = humanizeValidationErrors(
      {
        errors: { customFeature: "customFeature is required" },
        warnings: {},
      },
      sparse,
    );
    expect(result.errors[0]).toContain("customFeature");
  });

  test("longest id is replaced before shorter ids (jsLib before js)", () => {
    const result = humanizeValidationErrors(
      {
        errors: {
          jsLib: 'jsLib="preact" requires js ≠ none (currently js=none)',
        },
        warnings: {},
      },
      catalog,
    );
    expect(result.errors[0]).toContain("JavaScript Library");
    expect(result.errors[0]).toContain("JavaScript");
    expect(result.errors[0]).not.toMatch(/\bjsLib\b/);
  });
});
