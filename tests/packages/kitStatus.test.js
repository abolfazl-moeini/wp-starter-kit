/**
 * Phase 24.12 / 24.13 — `getKitStatus(dir, { lookupLatest? })` contract.
 *
 * The installer's `wpdev info` command runs this function. It
 * is the "tell me about this kit / project" surface.
 *
 * The contract:
 *
 *   getKitStatus(dir, { lookupLatest? }) → Promise<{
 *     ok: true,
 *     kitVersion,         // from the manifest
 *     distMode,           // from the manifest
 *     features,           // from the manifest
 *     path,               // absolute project path
 *     updateAvailable?,   // true iff lookupLatest resolves to
 *                        // a NEWER version than kitVersion
 *     latestKitVersion?,  // the version lookupLatest returned
 *   }>
 *
 * Edge cases:
 *
 *  - Manifest missing → `Promise<{ok:false, reason:string}>`.
 *    The CLI shows a clear "not a wpdev project" message and
 *    exits with a non-zero code.
 *
 *  - `lookupLatest` is OPTIONAL. The default is a noop
 *    resolving to `null` (production CLI I5 will inject a
 *    real one that hits the npm registry — the engine
 *    doesn't ship that code, just the seam). The tests
 *    provide a fake.
 *
 *  - When `lookupLatest` returns `null` (network error, no
 *    newer version published, etc.), the result has
 *    `updateAvailable: undefined` and `latestKitVersion:
 *    undefined`. We don't guess.
 *
 *  - When `lookupLatest` returns a version, the function
 *    compares it to `kitVersion` and sets `updateAvailable`
 *    accordingly. The comparison is numeric semver (so
 *    "0.9.0" < "0.10.0").
 *
 * All public APIs are async (Promise-returning) because the
 * production `lookupLatest` is async (it hits the registry).
 * The default (no lookup) is `async` too — it resolves to
 * `null` on the next tick. Tests can `await` either way
 * without branching.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { getKitStatus } from "../../packages/create-wp-project/src/kit-status.js";

async function seedProject({
  kitVersion = "0.1.0",
  distMode = "vendored",
  features = { js: "typescript", phpTest: "phpunit" },
} = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-status-"));
  const manifest = {
    schema: 1,
    kitVersion,
    distMode,
    generatedAt: "2026-01-01T00:00:00.000Z",
    features,
  };
  await fs.writeFile(
    path.join(dir, "wpdev.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  return dir;
}

describe("getKitStatus() — no manifest (Phase 24.12)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-status-no-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns {ok:false, reason} when wpdev-kit.json is missing", async () => {
    const res = await getKitStatus(tmpDir);
    expect(res.ok).toBe(false);
    expect(typeof res.reason).toBe("string");
    expect(res.reason.length).toBeGreaterThan(0);
  });
});

describe("getKitStatus() — basic read (Phase 24.12)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await seedProject({
      kitVersion: "0.2.0",
      distMode: "deps",
      features: { js: "typescript", phpTest: "phpunit", husky: "off" },
    });
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns kitVersion, distMode, features, and path from the manifest", async () => {
    const res = await getKitStatus(tmpDir);
    expect(res.ok).toBe(true);
    expect(res.kitVersion).toBe("0.2.0");
    expect(res.distMode).toBe("deps");
    expect(res.features).toEqual({
      js: "typescript",
      phpTest: "phpunit",
      husky: "off",
    });
    // path is the absolute project dir
    expect(res.path).toBe(path.resolve(tmpDir));
  });

  test("does NOT include updateAvailable or latestKitVersion when no lookupLatest was injected", async () => {
    const res = await getKitStatus(tmpDir);
    expect(res.updateAvailable).toBeUndefined();
    expect(res.latestKitVersion).toBeUndefined();
  });
});

describe("getKitStatus() — with injected lookupLatest (Phase 24.13)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await seedProject({ kitVersion: "0.1.0" });
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("when lookupLatest returns a NEWER version, updateAvailable is true and latestKitVersion is set", async () => {
    const lookupLatest = async () => "0.2.0";
    const res = await getKitStatus(tmpDir, { lookupLatest });
    expect(res.ok).toBe(true);
    expect(res.updateAvailable).toBe(true);
    expect(res.latestKitVersion).toBe("0.2.0");
  });

  test("when lookupLatest returns the SAME version, updateAvailable is false", async () => {
    const lookupLatest = async () => "0.1.0";
    const res = await getKitStatus(tmpDir, { lookupLatest });
    expect(res.ok).toBe(true);
    expect(res.updateAvailable).toBe(false);
    expect(res.latestKitVersion).toBe("0.1.0");
  });

  test("when lookupLatest returns an OLDER version, updateAvailable is false (no downgrade flag)", async () => {
    const lookupLatest = async () => "0.0.5";
    const res = await getKitStatus(tmpDir, { lookupLatest });
    expect(res.ok).toBe(true);
    expect(res.updateAvailable).toBe(false);
  });

  test("when lookupLatest returns null (network error / no data), updateAvailable is undefined", async () => {
    const lookupLatest = async () => null;
    const res = await getKitStatus(tmpDir, { lookupLatest });
    expect(res.ok).toBe(true);
    expect(res.updateAvailable).toBeUndefined();
    expect(res.latestKitVersion).toBeUndefined();
  });

  test("comparison is numeric semver (0.9.0 < 0.10.0, not lexicographic)", async () => {
    // Seed at 0.9.0; lookupLatest returns 0.10.0. The
    // function MUST recognise 0.10.0 as newer (numeric
    // comparison) — a string sort would put "0.10.0" BEFORE
    // "0.9.0" because "1" < "9", and updateAvailable would
    // erroneously be false.
    const dir2 = await seedProject({ kitVersion: "0.9.0" });
    try {
      const lookupLatest = async () => "0.10.0";
      const res = await getKitStatus(dir2, { lookupLatest });
      expect(res.updateAvailable).toBe(true);
      expect(res.latestKitVersion).toBe("0.10.0");
    } finally {
      await fs.rm(dir2, { recursive: true, force: true });
    }
  });
});
