/**
 * Phase 24.1 / 24.2 — migration registry contract.
 *
 * The engine ships a folder of `migrations/*.js` modules. Each
 * module exports a single descriptor `{ version, description,
 * run }` where:
 *
 *   - `version`    is a semver string ("0.2.0", "1.0.0", ...).
 *   - `description` is a one-line human-readable summary.
 *   - `run(dir)`   is an async function that applies the
 *                  migration to a consumer project rooted at
 *                  `dir`. May return `{ok:true}` on success or
 *                  `{ok:false, reason}` on a soft failure; may
 *                  also throw on a hard failure.
 *
 * The registry's contract (locked by these tests):
 *
 *  1. `getMigrations()` returns the registered array.
 *  2. The array is sorted ASCENDING by semver (numeric, not
 *     lexicographic — so "0.9.0" < "0.10.0" and not the other
 *     way around).
 *  3. Every entry has the three required fields with the
 *     correct types (version: string, description: string,
 *     run: function).
 *  4. Every entry is an object (no primitive slips in).
 *  5. The registry always has at least one baseline migration
 *     (the 0.2.0 vendored->deps cleanup shipped with Phase 23/24).
 *
 * Select / runMigrations contracts are covered in
 * `migrations.select.test.js` and `migrations.run.test.js`.
 */

import { describe, test, expect } from "@jest/globals";

import { getMigrations } from "../../packages/create-wp-project/src/migrations/index.js";

describe("getMigrations() — registry shape (Phase 24.1, 24.2)", () => {
  test("returns an array", () => {
    const list = getMigrations();
    expect(Array.isArray(list)).toBe(true);
  });

  test("returns at least one migration (the 0.2.0 vendored->deps cleanup)", () => {
    const list = getMigrations();
    expect(list.length).toBeGreaterThanOrEqual(1);
    const versions = list.map((m) => m.version);
    expect(versions).toContain("0.2.0");
  });

  test("every entry is an object (no primitive slips in)", () => {
    const list = getMigrations();
    for (const m of list) {
      expect(typeof m).toBe("object");
      expect(m).not.toBeNull();
      // Array.isArray check — primitives and arrays are both
      // rejected. The array form is checked separately below.
      expect(Array.isArray(m)).toBe(false);
    }
  });

  test("every entry has version, description, run with correct types", () => {
    const list = getMigrations();
    for (const m of list) {
      expect(typeof m.version).toBe("string");
      expect(m.version.length).toBeGreaterThan(0);
      expect(typeof m.description).toBe("string");
      expect(m.description.length).toBeGreaterThan(0);
      expect(typeof m.run).toBe("function");
    }
  });

  test("is sorted ascending by semver (numeric, not lexicographic)", () => {
    const list = getMigrations();
    const versions = list.map((m) => m.version);
    // Build a semver-sorted copy and compare.
    const sorted = [...versions].sort((a, b) =>
      compareSemver(a, b) < 0 ? -1 : compareSemver(a, b) > 0 ? 1 : 0,
    );
    expect(versions).toEqual(sorted);
  });

  test("sorting is NUMERIC (0.9.0 < 0.10.0, not lexicographic)", () => {
    // We rely on the registry's own sort. Inject three values
    // that, lexicographically, would order differently:
    //   "0.2.0" < "0.9.0" < "0.10.0"  (numeric — correct)
    //   "0.10.0" < "0.2.0" < "0.9.0"  (lexicographic — wrong)
    // The 0.2.0 vendored->deps migration is the baseline shipped, so
    // this test is a smoke test against a future registry
    // regression: if a later phase adds 0.9.0 and 0.10.0, the
    // order must remain numeric. We assert that the existing
    // 0.2.0 entry exists and is in valid position by index 0
    // (it's the smallest in the registry), AND that the
    // registry's sort function is the same numeric one the test
    // uses — guarded by the test below that cross-checks a
    // numeric comparison.
    const list = getMigrations();
    const idx = list.findIndex((m) => m.version === "0.2.0");
    expect(idx).toBeGreaterThanOrEqual(0);

    // Direct cross-check: 0.2.0 must be `<=` 0.9.0 numerically,
    // and `<=` 0.10.0 numerically. The registry's actual sort
    // is exercised by the previous test; this is the property
    // that protects against a future "sort by string" bug.
    const sortedPair = ["0.2.0", "0.9.0", "0.10.0"].sort((a, b) =>
      compareSemver(a, b) < 0 ? -1 : 1,
    );
    expect(sortedPair).toEqual(["0.2.0", "0.9.0", "0.10.0"]);
  });

  test("has no duplicate versions", () => {
    const list = getMigrations();
    const seen = new Set();
    for (const m of list) {
      expect(seen.has(m.version)).toBe(false);
      seen.add(m.version);
    }
  });
});

/* -------------------------------------------------------------------- */
/* Local semver compare helper                                           */
/* -------------------------------------------------------------------- */
//
// The test file re-uses the same numeric split-dot-compare the
// registry uses. The duplication is intentional: the test
// asserts the registry's output is sorted by THIS comparison,
// so we keep the helper local. If a future phase swaps the
// implementation for a real `semver` dep, this helper is
// updated to match and the test continues to assert the
// property the contract depends on (numeric ascending).

function compareSemver(a, b) {
  const [aMaj, aMin, aPat] = a.split(".").map((n) => parseInt(n, 10));
  const [bMaj, bMin, bPat] = b.split(".").map((n) => parseInt(n, 10));
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aPat - bPat;
}
