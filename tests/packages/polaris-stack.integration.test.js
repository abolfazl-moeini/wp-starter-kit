import { describe, test, expect } from "@jest/globals";
import {
  defaultFeatures,
  validateFeatureSet,
} from "../../packages/create-wp-project/src/features.js";
import { polarisFiles } from "../../packages/create-wp-project/src/generators/_polaris-template.js";
import { getGenerators } from "../../packages/create-wp-project/src/generators/index.js";
import { run as runFrontendStack } from "../../packages/create-wp-project/src/generators/frontendStack.js";

describe("frontendStack feature integration", () => {
  test("defaultFeatures includes frontendStack none", () => {
    expect(defaultFeatures().frontendStack).toBe("none");
  });

  test("validateFeatureSet accepts polaris with TS + preact", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "typescript",
      jsLib: "preact",
      frontendStack: "polaris",
    });
    expect(r.ok).toBe(true);
  });

  test("validateFeatureSet rejects polaris with js none", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "none",
      jsLib: "none",
      frontendStack: "polaris",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.frontendStack).toMatch(/typescript/);
  });

  test("validateFeatureSet rejects polaris with tailwind", () => {
    const r = validateFeatureSet({
      ...defaultFeatures(),
      js: "typescript",
      jsLib: "preact",
      css: "tailwind",
      frontendStack: "polaris",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.frontendStack).toMatch(/tailwind/);
  });

  test("polarisFiles exports core template paths", () => {
    const files = polarisFiles({ features: { jsLib: "preact" } });
    expect(files["index.ts"]).toBeDefined();
    expect(files["styles.css"]).toContain("--ps-color-bg");
    expect(files["layout/Stack.tsx"]).toBeDefined();
    expect(files["components/Button.tsx"]).toBeDefined();
  });

  test("frontendStack generator writes polaris shortcode demo via ShortcodesSetup", () => {
    const ctx = {
      features: { frontendStack: "polaris", jsLib: "preact" },
      answers: { slug: "my-plugin", globalName: "MyPlugin", textDomain: "my-plugin" },
      cfg: {},
      vars: { vendor: "MyPlugin", frameworkNamespace: "WPDev" },
    };
    const out = runFrontendStack(ctx);
    expect(out.files["src/polaris/index.ts"]).toBeDefined();
    expect(out.files["src/polaris/styles.css"]).toContain("--ps-color-bg");
    const viewEntry =
      out.files["src/Modules/PolarisDemo/assets/entries/view.tsx"];
    expect(viewEntry).toBeDefined();
    expect(viewEntry).toMatch(/polaris\/styles\.css/);
    // Prefer JSX over hyperscript h(...) for readability.
    expect(viewEntry).toMatch(/<Stack\b/);
    expect(viewEntry).toMatch(/<Button\b/);
    expect(viewEntry).not.toMatch(/\bh\s*\(/);
    expect(out.files["src/Modules/PolarisDemo/assets/entries/view.ts"]).toBe(
      undefined,
    );
    expect(out.files["src/Modules/PolarisDemo/Module.php"]).toMatch(
      /ShortcodesSetup::register/,
    );
    expect(
      out.files["src/Modules/PolarisDemo/Shortcodes/DemoShortcode.php"],
    ).toMatch(/extends Shortcode/);
    expect(out.files["src/polaris-demo-register.php"]).toBeDefined();
    expect(out.composerPatches?.autoload?.files).toContain(
      "src/polaris-demo-register.php",
    );
  });

  test("getGenerators enables frontendStack when polaris selected", () => {
    const gens = getGenerators({
      ...defaultFeatures(),
      js: "typescript",
      jsLib: "preact",
      frontendStack: "polaris",
    });
    expect(gens.some((g) => g.id === "frontendStack")).toBe(true);
  });
});
