/**
 * Phase 24.8 part 2 — `getDepVersions()` registry contract.
 *
 * The kit ships a registry of "what dep versions does this kit
 * currently expect" — a Map<packageName, "pinned-range"> covering
 * the JS/TS/eslint/jest/preact/react toolchain (npm) and the
 * phpunit/phpstan/strauss/rector/php-stubs chain (composer).
 *
 * Two consumers in Phase 24:
 *  - `planUpdate(dir, toVersion)` — diffs the project's installed
 *    ranges against the registry to report add/remove/bump.
 *  - `runMigrations` (future bump step) — uses the registry to
 *    patch package.json + composer.json with the new ranges.
 *
 * The contract locked by these tests:
 *
 *  1. `getDepVersions()` returns a `Map`.
 *  2. The map is non-empty (the kit has a toolchain to ship).
 *  3. Keys are unique (Map guarantees this; the test is a
 *     structural sanity check, not a regression guard).
 *  4. The map includes the JS/TS/build chain from the kit's own
 *     `package.json` — the version range string MUST match the
 *     kit's own dep range (e.g. "typescript" → the same "^x.y.z"
 *     the kit's package.json declares). This is the load-bearing
 *     guarantee: a future "lock the registry" commit can't drift
 *     the registry from the kit's own deps without breaking this
 *     test.
 *  5. Every value is a non-empty string.
 *
 * Note: the registry is intentionally *over-inclusive* — it
 * lists the kit's CURRENT toolchain. Migrations + bump steps
 * diff the consumer's deps against this set, so a dep the kit
 * has dropped (e.g. a deprecated linter) still appears in the
 * registry for one release to be reported as a "remove". After
 * a release, it's safe to drop the entry. The map is plain
 * static data, so a one-line edit is the migration policy.
 */

import { describe, test, expect } from "@jest/globals";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import {
  getDepVersions,
  readWpdevFrameworkVersion,
  CONSUMER_RUNTIME_WPDEV_PACKAGES,
  CONSUMER_BUILD_WPDEV_PACKAGES,
} from "../../packages/create-wp-project/src/dep-versions.js";

/**
 * Resolve the absolute path of the kit's own root package.json.
 * Used by the "registry matches kit's own deps" check — that
 * test reads the kit's package.json fresh on disk and asserts
 * the registered range for `typescript` / `jest` / `esbuild` /
 * `preact` matches the kit's own declared range. This guards
 * against a future "update the kit's package.json but forget
 * the registry" drift.
 *
 * Resolution: __dirname (Babel-injected) → argv[1] (CLI) → cwd
 * fallback. Mirrors the kit's own modulePath() helper but
 * resolved at test-load time (no caching needed).
 */
function findKitPackageJson() {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith("depVersions.test.js")
  ) {
    here = path.dirname(process.argv[1]);
  } else {
    here = process.cwd();
  }
  // tests/packages/depVersions.test.js → ../../package.json
  return path.join(here, "..", "..", "package.json");
}

describe("getDepVersions() — registry shape (Phase 24.8 part 2)", () => {
  test("returns a Map", () => {
    const m = getDepVersions();
    expect(m).toBeInstanceOf(Map);
  });

  test("is non-empty (the kit ships a toolchain to register)", () => {
    const m = getDepVersions();
    expect(m.size).toBeGreaterThan(0);
  });

  test("every value is a non-empty string", () => {
    const m = getDepVersions();
    for (const [, v] of m) {
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    }
  });

  test("keys are unique (Map invariant — structural sanity)", () => {
    const m = getDepVersions();
    const seen = new Set();
    for (const k of m.keys()) {
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    expect(seen.size).toBe(m.size);
  });
});

describe("getDepVersions() — covers the JS/TS/build chain (Phase 24.8 part 2)", () => {
  // The test reads the kit's own package.json (the source of
  // truth for the current toolchain) and asserts the registry
  // entry for each listed dep matches. If a future kit release
  // bumps typescript, the test would fail until the registry
  // is updated in lock-step — which is the contract.
  //
  // The list below is the minimum chain the test requires. The
  // registry is allowed to list MORE deps (it does), but it
  // MUST list these four and the version range MUST match.
  const REQUIRED_JS_DEPS = ["typescript", "jest", "esbuild", "preact"];

  test.each(REQUIRED_JS_DEPS)(
    "registry entry for '%s' matches the kit's own package.json devDependencies range",
    (depName) => {
      const m = getDepVersions();
      const registered = m.get(depName);
      expect(registered).toBeDefined();
      // The kit's own package.json is the source of truth. The
      // registry MUST agree. Both devDeps and deps are checked
      // because the kit's `react` → npm:@preact/compat alias
      // lives in `dependencies` (not devDeps).
      const pkgPath = findKitPackageJson();
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      const kitRange =
        (pkg.devDependencies && pkg.devDependencies[depName]) ||
        (pkg.dependencies && pkg.dependencies[depName]) ||
        null;
      expect(kitRange).not.toBeNull();
      expect(registered).toBe(kitRange);
    },
  );

  test("registry includes a typescript entry (smoke — the canonical build chain dep)", () => {
    const m = getDepVersions();
    const ts = m.get("typescript");
    expect(typeof ts).toBe("string");
    // Sanity: must look like a semver range (starts with ^, ~, or a digit).
    expect(ts).toMatch(/^[\^~]?\d/);
  });
});

describe("getDepVersions() — consumer @wpdev/* package list (TASK-22c)", () => {
  test("CONSUMER_RUNTIME_WPDEV_PACKAGES omits deprecated @wpdev/fetch", () => {
    expect(CONSUMER_RUNTIME_WPDEV_PACKAGES).not.toContain("@wpdev/fetch");
    expect(CONSUMER_RUNTIME_WPDEV_PACKAGES).toContain("@wpdev/rest-utils");
  });

  test.each(CONSUMER_RUNTIME_WPDEV_PACKAGES)(
    "registry has a version for consumer runtime package %s",
    (pkg) => {
      const m = getDepVersions();
      expect(m.has(pkg)).toBe(true);
      expect(typeof m.get(pkg)).toBe("string");
    },
  );

  test.each(CONSUMER_BUILD_WPDEV_PACKAGES)(
    "registry has a version for consumer build package %s",
    (pkg) => {
      const m = getDepVersions();
      expect(m.has(pkg)).toBe(true);
      expect(typeof m.get(pkg)).toBe("string");
    },
  );
});

describe("getDepVersions() — covers the composer (PHP) chain (Phase 24.8 part 2)", () => {
  // The registry is symmetric: it lists BOTH npm deps (js/ts/
  // esbuild/...) AND composer deps (phpunit/phpstan/strauss/
  // rector/...). The composer side is keyed by the composer
  // package name and the value is the same "pinned range" the
  // consumer's composer.json is expected to have after a
  // `wpdev update`.
  //
  // We assert presence (not range equality) for the composer
  // chain because the test would otherwise need to parse the
  // kit's own composer.json — a heavier setup. The JS-chain
  // equality test (above) is enough to catch a drift bug.
  const COMPOSER_DEPS = [
    "phpunit/phpunit",
    "szepeviktor/phpstan-wordpress",
    "brianhenryie/strauss",
    "rector/rector",
  ];

  test.each(COMPOSER_DEPS)(
    "registry has an entry for composer dep '%s'",
    (depName) => {
      const m = getDepVersions();
      expect(m.has(depName)).toBe(true);
      const v = m.get(depName);
      expect(typeof v).toBe("string");
      expect(v.length).toBeGreaterThan(0);
    },
  );

  test("registry includes vendored wpdevFramework version", () => {
    const m = getDepVersions();
    const fromRegistry = m.get("wpdevFramework");
    const fromConstants = readWpdevFrameworkVersion();
    expect(fromConstants).toBeTruthy();
    expect(fromRegistry).toBe(fromConstants);
  });
});
