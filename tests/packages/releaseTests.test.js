/**
 * Pre-dist release test gate helpers.
 */
import { describe, test, expect } from "@jest/globals";

import {
  shouldSkipReleaseTests,
  resolveReleaseTestPlan,
  runReleaseTests,
  gateReleaseTests,
} from "../../packages/create-wp-project/src/release/releaseTests.js";

describe("shouldSkipReleaseTests", () => {
  test("defaults to false", () => {
    expect(shouldSkipReleaseTests({}, {})).toBe(false);
  });

  test("honors --skip-tests option", () => {
    expect(shouldSkipReleaseTests({ skipTests: true }, {})).toBe(true);
  });

  test("honors WPDEV_SKIP_TESTS env", () => {
    expect(shouldSkipReleaseTests({}, { WPDEV_SKIP_TESTS: "1" })).toBe(true);
    expect(shouldSkipReleaseTests({}, { WPDEV_SKIP_TESTS: "true" })).toBe(true);
    expect(shouldSkipReleaseTests({}, { WPDEV_SKIP_TESTS: "0" })).toBe(false);
  });
});

describe("resolveReleaseTestPlan", () => {
  const pkg = {
    scripts: { test: "jest", "test:e2e": "wp-scripts test-playwright" },
  };
  const composer = { scripts: { test: "phpunit" } };

  test("includes php/js/e2e when features are on", () => {
    const plan = resolveReleaseTestPlan(
      { phpTest: "phpunit", jsTest: "jest", e2eTest: "playwright" },
      pkg,
      composer,
    );
    expect(plan.map((s) => s.id)).toEqual(["phpunit", "js", "e2e"]);
  });

  test("omits suites when features are none", () => {
    const plan = resolveReleaseTestPlan(
      { phpTest: "none", jsTest: "none", e2eTest: "none" },
      pkg,
      composer,
    );
    expect(plan).toEqual([]);
  });

  test("throws when feature is on but script missing", () => {
    expect(() =>
      resolveReleaseTestPlan(
        { phpTest: "phpunit", jsTest: "none", e2eTest: "none" },
        pkg,
        { scripts: {} },
      ),
    ).toThrow(/scripts\.test/);
    expect(() =>
      resolveReleaseTestPlan(
        { phpTest: "none", jsTest: "vitest", e2eTest: "none" },
        { scripts: {} },
        composer,
      ),
    ).toThrow(/scripts\.test/);
    expect(() =>
      resolveReleaseTestPlan(
        { phpTest: "none", jsTest: "none", e2eTest: "playwright" },
        { scripts: { test: "jest" } },
        composer,
      ),
    ).toThrow(/test:e2e/);
  });

  test("falls back to script discovery when features absent", () => {
    const plan = resolveReleaseTestPlan(null, pkg, composer);
    expect(plan.map((s) => s.id)).toEqual(["phpunit", "js", "e2e"]);
  });

  test("partial features: missing keys discover scripts; none skips", () => {
    const plan = resolveReleaseTestPlan({ e2eTest: "none" }, pkg, composer);
    expect(plan.map((s) => s.id)).toEqual(["phpunit", "js"]);
  });
});

describe("runReleaseTests / gateReleaseTests", () => {
  test("fail-fast throws on non-zero spawn", () => {
    const spawn = () => ({ status: 2 });
    expect(() =>
      runReleaseTests(
        "/tmp",
        [
          {
            id: "js",
            label: "JS unit",
            command: "npm",
            args: ["test"],
          },
        ],
        { spawn, log: () => {} },
      ),
    ).toThrow(/Release blocked/);
  });

  test("gate skips when skipTests set", () => {
    const logs = [];
    const result = gateReleaseTests(
      "/tmp",
      { skipTests: true },
      { log: (m) => logs.push(m), env: {} },
    );
    expect(result.skipped).toBe(true);
    expect(logs.join("\n")).toMatch(/Skipping release tests/);
  });

  test("gate runs plan and succeeds", () => {
    const calls = [];
    const spawn = (cmd, args) => {
      calls.push([cmd, ...args]);
      return { status: 0 };
    };
    // Use empty features via a root that won't be read — call runReleaseTests directly.
    runReleaseTests(
      "/tmp",
      [
        {
          id: "phpunit",
          label: "PHPUnit",
          command: "composer",
          args: ["test"],
        },
      ],
      { spawn, log: () => {} },
    );
    expect(calls).toEqual([["composer", "test"]]);
  });
});
