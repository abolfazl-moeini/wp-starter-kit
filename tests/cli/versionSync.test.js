/**
 * I7.5 / I7.6 — version sync between CLI and engine.
 *
 * Single source of truth: the version reported by `wpsk --version`
 * must equal the version declared in
 * `packages/create-wp-project/package.json` (the engine). Two
 * separate package versions drift apart over time — the CLI is a
 * thin dispatcher and the engine is the real product, so the
 * engine wins.
 *
 * Contract (plan.installer.md §I7.5–I7.6):
 *   1. `getKitVersion()` (no args, no env) → equals the engine's
 *      `package.json` `version` field, read from the
 *      `packages/create-wp-project/package.json` file on disk.
 *   2. `getKitVersion({ override: "X" })` → "X" (explicit override
 *      for tests / scripts).
 *   3. `WPSK_CLI_KIT_VERSION_OVERRIDE` env var, when set and
 *      non-empty, takes precedence over the on-disk read (test
 *      seam only — production code never sets it).
 *
 * The function MUST NOT throw when the engine package.json is
 * missing (defensive: returns "0.0.0" so `--version` still
 * prints something useful).
 */
import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { getKitVersion } from "../../packages/cli/src/version.js";

describe("getKitVersion() — I7.5/I7.6 (CLI <-> engine version sync)", () => {
  const ENV_VAR = "WPSK_CLI_KIT_VERSION_OVERRIDE";
  const ENGINE_PKG = join(
    process.cwd(),
    "packages/create-wp-project/package.json",
  );

  // Read the engine's declared version once — the test asserts
  // our helper returns the same value (the single source of
  // truth contract).
  const enginePkg = JSON.parse(readFileSync(ENGINE_PKG, "utf8"));
  const engineVersion = enginePkg.version;

  let savedEnv;
  beforeEach(() => {
    // Snapshot the env var so each test starts clean. We do NOT
    // set the env var at the suite level (jest doesn't isolate
    // process.env between tests by default).
    savedEnv = process.env[ENV_VAR];
    delete process.env[ENV_VAR];
  });
  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env[ENV_VAR];
    } else {
      process.env[ENV_VAR] = savedEnv;
    }
  });

  test("default returns the engine's on-disk version (single source of truth)", () => {
    // The CLI must NOT maintain its own version copy. It reads
    // the engine's package.json at runtime so a single `npm
    // version patch` in create-wp-project propagates
    // automatically.
    expect(getKitVersion()).toBe(engineVersion);
  });

  test("explicit override ({ override }) wins over the on-disk version", () => {
    // Test seam: callers (and tests) can pin a specific version
    // without mutating the env. Production code does not pass
    // this argument.
    expect(getKitVersion({ override: "9.9.9" })).toBe("9.9.9");
  });

  test("WPSK_CLI_KIT_VERSION_OVERRIDE env var wins over the on-disk version", () => {
    // The plan-mandated env var. Used in CI to pin the
    // reported version, and in tests to avoid filesystem
    // reads of the engine package.
    process.env[ENV_VAR] = "7.7.7";
    expect(getKitVersion()).toBe("7.7.7");
  });
});
