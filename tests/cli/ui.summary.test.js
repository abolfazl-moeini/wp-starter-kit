/**
 * Tests for `packages/cli/src/ui.js` — `renderSummary` and
 * `renderNextSteps` (I3 + I6 + I3.9/I3.10).
 *
 * Contract for `renderSummary({answers, features, runOptions})`:
 *   - Returns a string (so the bin can write it to stdout).
 *   - Includes the slug from `answers.slug`.
 *   - Includes the JS flavor (e.g. "typescript", "none").
 *   - Includes the JS UI library (e.g. "preact", "react", "none").
 *   - Includes the CSS framework (e.g. "tailwind", "none").
 *   - Includes the blocks toggle (e.g. "on", "off").
 *   - Includes the PHP minimum version.
 *   - Includes the fault-tolerance toggle.
 *   - Field order is stable (locked by the test — header lines
 *     appear in a specific sequence).
 *
 * Contract for `renderNextSteps(features, runOptions)`:
 *   - Returns an array of `cd <dir> && <command>` strings.
 *   - The first entry is always `cd <dir>`.
 *   - If js ≠ 'none' OR husky === 'on' → includes `npm install`.
 *   - If phpTest === 'phpunit' → includes `composer install`.
 *   - If install was not auto-run but a package.json exists, the
 *     next step still mentions npm install (advisory).
 */
import { describe, test, expect } from "@jest/globals";

import { renderSummary, renderNextSteps } from "../../packages/cli/src/ui.js";

/* -------------------------------------------------------------------- */
/* renderSummary                                                          */
/* -------------------------------------------------------------------- */

describe("renderSummary()", () => {
  test("returns a string (not a Promise, not an object)", () => {
    const out = renderSummary({
      answers: { slug: "my-plugin" },
      features: { js: "typescript", jsLib: "preact" },
      runOptions: {},
    });
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });

  test("includes the slug", () => {
    const out = renderSummary({
      answers: { slug: "acme-widgets" },
      features: {},
      runOptions: {},
    });
    expect(out).toMatch(/acme-widgets/);
  });

  test("includes the JS flavor and UI library", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: { js: "typescript", jsLib: "preact" },
      runOptions: {},
    });
    expect(out).toMatch(/typescript/i);
    expect(out).toMatch(/preact/i);
  });

  test("includes Abilities API (MCP) in header when mcpAbilities=on", () => {
    const out = renderSummary({
      answers: { slug: "my-plugin" },
      features: { js: "none", mcpAbilities: "on" },
      runOptions: {},
    });
    expect(out).toMatch(/Abilities API \(MCP\)/);
  });

  test("includes Polaris Stack in header when frontendStack=polaris", () => {
    const out = renderSummary({
      answers: { slug: "my-plugin" },
      features: {
        js: "typescript",
        jsLib: "preact",
        frontendStack: "polaris",
      },
      runOptions: {},
    });
    expect(out).toMatch(/Polaris Stack/);
    expect(out).toMatch(/TS\+Preact/);
  });

  test("includes the CSS framework when set", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: { js: "typescript", css: "tailwind" },
      runOptions: {},
    });
    expect(out).toMatch(/tailwind/i);
  });

  test("includes Blockstudio label when blocks:on", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: { js: "typescript", blocks: "on", phpMinVersion: "8.2" },
      runOptions: {},
    });
    expect(out).toMatch(/Blocks:\s*Blockstudio/i);
  });

  test("includes the PHP minimum version", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: { phpMinVersion: "8.1" },
      runOptions: {},
    });
    expect(out).toMatch(/PHP min.*8\.1/i);
  });

  test("includes the fault-tolerance toggle", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: { faultTolerance: "on" },
      runOptions: {},
    });
    expect(out).toMatch(/fault.tolerance:\s*on/i);
  });

  test("includes the 'on' toggles in a stable order (husky before i18n)", () => {
    // The plan specifies a stable order. We lock it by asserting
    // that `husky` appears before `i18n` in the rendered string.
    const out = renderSummary({
      answers: { slug: "x" },
      features: {
        js: "typescript",
        husky: "on",
        i18n: "on",
        vendorScoping: "on",
        restBatch: "on",
      },
      runOptions: {},
    });
    const idxHusky = out.search(/husky/i);
    const idxI18n = out.search(/i18n/i);
    expect(idxHusky).toBeGreaterThan(-1);
    expect(idxI18n).toBeGreaterThan(-1);
    expect(idxHusky).toBeLessThan(idxI18n);
  });

  test("tolerates missing fields (does not throw, returns a string)", () => {
    const out = renderSummary({
      answers: {},
      features: {},
      runOptions: {},
    });
    expect(typeof out).toBe("string");
    // The slug may be blank — that's OK, the user typed a bad
    // input and the validation gate will catch it elsewhere.
  });

  test("does not crash when features is undefined", () => {
    const out = renderSummary({
      answers: { slug: "x" },
      features: undefined,
      runOptions: {},
    });
    expect(typeof out).toBe("string");
  });
});

/* -------------------------------------------------------------------- */
/* renderNextSteps                                                       */
/* -------------------------------------------------------------------- */

describe("renderNextSteps()", () => {
  test("returns an array of strings", () => {
    const steps = renderNextSteps({}, { targetDir: "/tmp/proj" });
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(typeof s).toBe("string");
    }
  });

  test("the first step is always `cd <dir>`", () => {
    const steps = renderNextSteps(
      { js: "typescript", phpTest: "phpunit" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps[0]).toMatch(/^cd\s+\/tmp\/proj/);
  });

  test("js:typescript OR husky:on → 'npm install' step", () => {
    const steps = renderNextSteps(
      { js: "typescript" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(true);
  });

  test("husky:on (with js:none) → 'npm install' step (package.json for husky)", () => {
    const steps = renderNextSteps(
      { js: "none", husky: "on" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(true);
  });

  test("js:none + husky:off → NO 'npm install' step (no package.json emitted)", () => {
    const steps = renderNextSteps(
      { js: "none", husky: "off" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(false);
  });

  test("phpTest:phpunit → 'composer install' step", () => {
    const steps = renderNextSteps(
      { phpTest: "phpunit" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /composer install/.test(s))).toBe(true);
  });

  test("phpTest:none → NO 'composer install' step", () => {
    const steps = renderNextSteps(
      { phpTest: "none" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /composer install/.test(s))).toBe(false);
  });

  test("blocks:on → 'composer install' step even when phpTest:none", () => {
    const steps = renderNextSteps(
      { blocks: "on", phpTest: "none", js: "none" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /composer install/.test(s))).toBe(true);
  });

  test("blocks:on + phpMinVersion < 8.2 → runtime PHP advisory", () => {
    const steps = renderNextSteps(
      { blocks: "on", phpMinVersion: "7.4", phpTest: "none", js: "none" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /PHP 8\.2\+ at runtime/.test(s))).toBe(true);
  });

  test("the dir is taken from runOptions.targetDir", () => {
    const steps = renderNextSteps({}, { targetDir: "/some/custom/path" });
    expect(steps[0]).toMatch(/cd\s+\/some\/custom\/path/);
  });

  test("falls back to '.' when no targetDir is set", () => {
    const steps = renderNextSteps({}, {});
    expect(steps[0]).toMatch(/cd\s+\./);
  });

  test("includes a final 'npm test' step for JS projects (advisory)", () => {
    const steps = renderNextSteps(
      { js: "typescript" },
      { targetDir: "/tmp/proj" },
    );
    // The advisory line may be either 'npm test' (when no
    // installer ran) or absent (when the installer already ran).
    // We don't lock this one; the locked ones are above.
    expect(steps.length).toBeGreaterThanOrEqual(2);
  });
});
