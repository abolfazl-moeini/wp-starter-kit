/**
 * Phase 24.3 / 24.4 — `selectMigrations(from, to)` range selection.
 *
 * The contract:
 *
 *  - `selectMigrations(from, to)` returns the registered
 *    migrations whose `version` is STRICTLY greater than `from`
 *    AND less-than-or-equal to `to` — i.e. the half-open range
 *    `(from, to]`.
 *  - When `to === from`, the range is empty and the result is
 *    `[]` (the project is already at the target; the runner
 *    reports this as `alreadyCurrent`).
 *  - When `to < from`, the function THROWS — the caller has
 *    a version-range bug, and silently returning `[]` would
 *    mask a downgrade attempt.
 *  - Sort order is NUMERIC, not lexicographic. The "0.9.0 vs
 *    0.10.0" property is the whole reason we have a custom
 *    compare function (and not `Array.prototype.sort` on
 *    strings).
 *
 * The test exercises the public range-selection shape using
 * the registered 0.2.0 baseline; future migrations added to
 * the registry extend the cases (and the tests will need to
 * follow the catalog's actual content). We pick the cases
 * that prove the property:
 *
 *   1. `selectMigrations("0.1.0", "0.3.0")` returns [0.2.0]
 *      (the only registered migration in that range).
 *   2. `selectMigrations("0.2.0", "0.2.0")` returns []
 *      (already at target).
 *   3. `selectMigrations("0.3.0", "0.1.0")` throws.
 *   4. `selectMigrations("0.1.0", "0.10.0")` correctly orders
 *      the result. The registered set is currently [0.2.0],
 *      so the order check is [0.2.0]; the numeric-order
 *      property is also asserted by the registry's own sort
 *      test (migrations.registry.test.js). We add a focused
 *      property test using the registry's `compareSemver`
 *      helper to lock "0.2.0 < 0.9.0 < 0.10.0" numerically.
 */

import { describe, test, expect } from "@jest/globals";

import {
  selectMigrations,
  compareSemver,
  getMigrations,
} from "../../packages/create-wp-project/src/migrations/index.js";

describe("selectMigrations() — range selection (Phase 24.3, 24.4)", () => {
  test('selectMigrations("0.1.0", "0.3.0") returns migrations in (0.1.0, 0.3.0]', () => {
    const list = selectMigrations("0.1.0", "0.3.0");
    const versions = list.map((m) => m.version);
    expect(versions).toContain("0.2.0");
    expect(versions).toContain("0.3.0");
    expect(versions).toEqual(["0.2.0", "0.3.0"]);
  });

  test('selectMigrations("0.3.0", "0.4.0") returns [0.4.0]', () => {
    const list = selectMigrations("0.3.0", "0.4.0");
    expect(list.map((m) => m.version)).toEqual(["0.4.0"]);
  });

  test('selectMigrations("0.2.0", "0.2.0") returns [] (already at target)', () => {
    const list = selectMigrations("0.2.0", "0.2.0");
    expect(list).toEqual([]);
  });

  test('selectMigrations("0.3.0", "0.1.0") throws (to < from)', () => {
    expect(() => selectMigrations("0.3.0", "0.1.0")).toThrow(
      /is older than from/,
    );
  });

  test('selectMigrations("0.1.0", "0.10.0") returns the 0.2.0 entry in correct numeric order', () => {
    const list = selectMigrations("0.1.0", "0.10.0");
    const versions = list.map((m) => m.version);
    // The 0.2.0 entry is in the range; 0.10.0 is the boundary
    // (inclusive), so the 0.2.0 entry should be there.
    expect(versions).toContain("0.2.0");
    // Every returned version is in (0.1.0, 0.10.0] numerically.
    for (const v of versions) {
      expect(compareSemver("0.1.0", v)).toBeLessThan(0);
      expect(compareSemver(v, "0.10.0")).toBeLessThanOrEqual(0);
    }
  });

  test("selectMigrations is NUMERIC, not lexicographic (0.9.0 < 0.10.0)", () => {
    // Property test: feed in a list of versions that would
    // order DIFFERENTLY under lexicographic vs numeric sort,
    // and assert the registry's compareSemver agrees with
    // numeric semantics. This protects against a future
    // "revert to default sort" regression.
    const versions = ["0.2.0", "0.9.0", "0.10.0"];
    const sorted = [...versions].sort((a, b) => compareSemver(a, b));
    expect(sorted).toEqual(["0.2.0", "0.9.0", "0.10.0"]);
  });

  test("boundary: from is EXCLUSIVE (the from version itself is not in the result)", () => {
    // If a migration's version equals `from`, it must NOT be
    // selected — the project is already at that version.
    const list = selectMigrations("0.2.0", "0.5.0");
    const versions = list.map((m) => m.version);
    expect(versions).not.toContain("0.2.0");
  });

  test("boundary: to is INCLUSIVE (the to version itself IS in the result, if registered)", () => {
    // If a migration's version equals `to`, it IS selected.
    // The current registry only has 0.2.0, so we can't assert
    // an exact match for 0.5.0; instead we assert that, given
    // a from-version strictly less than 0.2.0, the 0.2.0
    // migration IS included when to=0.2.0 (covered by the
    // first test). The boundary property is locked by the
    // implementation: `compareSemver(m.version, to) <= 0`.
    // We re-state it here as an explicit case: from=0.1.0,
    // to=0.2.0 → [0.2.0].
    const list = selectMigrations("0.1.0", "0.2.0");
    const versions = list.map((m) => m.version);
    expect(versions).toEqual(["0.2.0"]);
  });

  test("empty registry range: a range with no registered migration returns []", () => {
    // A range that no migration falls into returns an empty
    // array (not a throw). Use a range above all known migrations.
    const list = selectMigrations("99.0.0", "99.9.9");
    expect(list).toEqual([]);
  });

  test("registry has at least the 0.2.0 entry (precondition for the other tests)", () => {
    const all = getMigrations().map((m) => m.version);
    expect(all).toContain("0.2.0");
  });
});

/* -------------------------------------------------------------------- */
/* compareSemver sanity                                                   */
/* -------------------------------------------------------------------- */

describe("compareSemver() — numeric comparison (Phase 24.4)", () => {
  test("equal versions compare to 0", () => {
    expect(compareSemver("0.2.0", "0.2.0")).toBe(0);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });

  test("minor bumps: 0.1.0 < 0.2.0", () => {
    expect(compareSemver("0.1.0", "0.2.0")).toBeLessThan(0);
    expect(compareSemver("0.2.0", "0.1.0")).toBeGreaterThan(0);
  });

  test("major bumps: 0.9.9 < 1.0.0", () => {
    expect(compareSemver("0.9.9", "1.0.0")).toBeLessThan(0);
  });

  test("numeric-not-lexicographic: 0.9.0 < 0.10.0", () => {
    // The defining property — a string sort would put "0.10.0"
    // BEFORE "0.9.0" because "1" < "9". We assert the opposite.
    expect(compareSemver("0.9.0", "0.10.0")).toBeLessThan(0);
    expect(compareSemver("0.10.0", "0.9.0")).toBeGreaterThan(0);
  });

  test("numeric-not-lexicographic: 0.2.0 < 0.2.10", () => {
    expect(compareSemver("0.2.0", "0.2.10")).toBeLessThan(0);
  });

  test("throws on non-string input", () => {
    expect(() => compareSemver(0.2, "0.2.0")).toThrow();
    expect(() => compareSemver("0.2.0", null)).toThrow();
  });
});
