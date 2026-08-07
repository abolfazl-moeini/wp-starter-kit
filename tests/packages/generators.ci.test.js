/**
 * Phase 26.4 — consumer CI workflow generator.
 */

import { describe, test, expect } from "@jest/globals";

import { run as ciRun } from "../../packages/create-wp-project/src/generators/ci.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

function makeCtx(features = {}) {
  return {
    answers: {},
    cfg: {},
    features: { ...defaultFeatures(), ...features },
  };
}

describe("ci generator (Phase 26.4)", () => {
  test("emits .github/workflows/ci.yml when phpTest:phpunit", () => {
    const out = ciRun(
      makeCtx({ phpTest: "phpunit", jsTest: "none", js: "none" }),
    );
    expect(out.files[".github/workflows/ci.yml"]).toBeDefined();
    expect(out.files[".github/workflows/ci.yml"]).toMatch(/phpunit/);
  });

  test("emits .github/workflows/ci.yml when jsTest:jest + js on", () => {
    const out = ciRun(
      makeCtx({ js: "typescript", jsTest: "jest", phpTest: "none" }),
    );
    expect(out.files[".github/workflows/ci.yml"]).toBeDefined();
    expect(out.files[".github/workflows/ci.yml"]).toMatch(/npm test/);
  });

  test("emits nothing when both test runners are off", () => {
    const out = ciRun(makeCtx({ js: "none", jsTest: "none", phpTest: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test('ci:"off" produces no .github/workflows/ci.yml even with phpunit', () => {
    const out = ciRun(
      makeCtx({ ci: "off", phpTest: "phpunit", jsTest: "none", js: "none" }),
    );
    expect(out.files[".github/workflows/ci.yml"]).toBeUndefined();
  });

  test("CI php-version follows max(phpMinVersion, phpSourceVersion)", () => {
    const out = ciRun({
      answers: {},
      cfg: { phpMinVersion: "7.4", phpSourceVersion: "8.1" },
      features: {
        ...defaultFeatures(),
        phpTest: "phpunit",
        jsTest: "none",
        js: "none",
        phpMinVersion: "7.4",
      },
    });
    expect(out.files[".github/workflows/ci.yml"]).toMatch(
      /php-version:\s*"8\.1"/,
    );

    const out2 = ciRun({
      answers: {},
      cfg: { phpMinVersion: "8.2", phpSourceVersion: "8.1" },
      features: {
        ...defaultFeatures(),
        phpTest: "phpunit",
        jsTest: "none",
        js: "none",
        phpMinVersion: "8.2",
      },
    });
    expect(out2.files[".github/workflows/ci.yml"]).toMatch(
      /php-version:\s*"8\.2"/,
    );
  });
});
