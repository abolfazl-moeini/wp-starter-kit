/**
 * Phase 24.7 / 24.8 — `planUpdate(dir, toVersion)` dry-run contract.
 *
 * The installer runs `wpsk update` in two phases:
 *
 *   1. `wpsk update` (default) — runs `planUpdate(dir, toVersion)`
 *      and PRINTS the plan. No disk writes. The user reads
 *      the plan and decides whether to apply.
 *   2. `wpsk update --run` — calls `runMigrations(dir, ...)`
 *      to actually apply the plan.
 *
 * The plan is a plain object the CLI can JSON.stringify and
 * pretty-print. Its shape (locked by these tests):
 *
 *   {
 *     ok: true,
 *     from: "0.1.0",            // current kitVersion
 *     to: "0.2.0",              // requested
 *     migrations: [             // what would run
 *       { version, description }
 *     ],
 *     depChanges: {             // package.json + composer.json diffs
 *       package: { add: {}, remove: {}, bump: {} },
 *       composer: { add: {}, remove: {}, bump: {} }
 *     }
 *   }
 *
 * Edge cases (locked by tests):
 *
 *  - `to <= from` (already at or past target) → returns
 *    `{ok:true, noop:true, current: toVersion}`. The "already
 *    current" semantic: NO migrations listed, NO dep changes,
 *    just the "you're already there" marker.
 *
 *  - Manifest missing → returns `{ok:false, reason:"no manifest"}`.
 *    The CLI shows the user a clear "this isn't a wpsk project"
 *    message.
 *
 *  - `package.json` and/or `composer.json` missing → the
 *    plan still reports a valid shape; `depChanges.{package,
 *    composer}.add` contains every dep the registry knows
 *    about (treated as a fresh install). A consumer without
 *    a `package.json` is unusual but legal (PHP-only project
 *    that doesn't need npm) and the dry-run must not crash.
 *
 *  - No disk writes — verified by snapshotting the dir's
 *    mtime / files before and after the call.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { planUpdate } from "../../packages/create-wp-project/src/plan-update.js";

/**
 * Build a fresh tmp project for each test. Seeds a 0.1.0
 * manifest and a minimal `package.json` + `composer.json` so
 * the "dep diff" code path has something to read.
 *
 * The seed is intentionally small (a 2-dep package.json, a
 * 1-dep composer.json) so the test can assert the diff
 * contains EXACTLY the expected deltas — no noise from
 * every dep the kit ships.
 */
async function seedProject({
  kitVersion = "0.1.0",
  packageDeps = {
    typescript: "^5.0.0", // OLD range — registry now ships ^5.6.0 → bump
  },
  composerDeps = {
    "phpunit/phpunit": "^9.0.0", // OLD range — registry ships ^9.6 → bump
    "extra/dep": "^1.0.0", // NOT in registry → remove
  },
} = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-plan-"));
  const manifest = {
    schema: 1,
    kitVersion,
    distMode: "vendored",
    generatedAt: "2026-01-01T00:00:00.000Z",
    features: {},
  };
  await fs.writeFile(
    path.join(dir, "wpsk-kit.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  const pkg = {
    name: "@test/sample",
    version: "0.1.0",
    private: true,
    dependencies: packageDeps,
  };
  await fs.writeFile(
    path.join(dir, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
    "utf8",
  );
  const composer = {
    name: "test/sample",
    type: "project",
    require: { php: ">=7.4" },
    "require-dev": composerDeps,
  };
  await fs.writeFile(
    path.join(dir, "composer.json"),
    JSON.stringify(composer, null, 2) + "\n",
    "utf8",
  );
  return dir;
}

describe("planUpdate() — happy path (Phase 24.7, 24.8)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await seedProject();
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("returns a plain object with the documented shape", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    expect(plan.ok).toBe(true);
    expect(plan.from).toBe("0.1.0");
    expect(plan.to).toBe("0.2.0");
    expect(Array.isArray(plan.migrations)).toBe(true);
    expect(plan.depChanges).toBeDefined();
    expect(plan.depChanges.package).toBeDefined();
    expect(plan.depChanges.composer).toBeDefined();
    // Each side of depChanges has the three buckets.
    for (const side of ["package", "composer"]) {
      const side_obj = plan.depChanges[side];
      expect(side_obj.add).toBeDefined();
      expect(side_obj.remove).toBeDefined();
      expect(side_obj.bump).toBeDefined();
    }
  });

  test("lists the 0.2.0 migration in the migrations array (smoke)", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    const versions = plan.migrations.map((m) => m.version);
    expect(versions).toContain("0.2.0");
    // The 0.2.0 baseline is the only migration registered
    // currently; the spec says the result may grow as more
    // migrations are added. For now, [0.2.0] is the contract.
    expect(versions).toEqual(["0.2.0"]);
    // Each entry has the documented shape.
    for (const m of plan.migrations) {
      expect(typeof m.version).toBe("string");
      expect(typeof m.description).toBe("string");
    }
  });

  test("diff: typescript is reported as a bump in package.add (range changed)", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    // The seed has `typescript: ^5.0.0`; the registry ships
    // `^5.6.0`. Both the old and new range are recorded in
    // `bump` (see planUpdate spec). The test allows either
    // bump OR remove+add to satisfy the contract — both are
    // valid "the range changed" representations. The current
    // implementation uses `bump` for in-place version changes.
    const ts = plan.depChanges.package.bump.typescript;
    if (ts) {
      // bump form: { from, to }
      expect(typeof ts.from).toBe("string");
      expect(typeof ts.to).toBe("string");
      expect(ts.from).toBe("^5.0.0");
    } else {
      // alternate: add/remove pair
      expect(plan.depChanges.package.remove.typescript).toBe("^5.0.0");
      expect(plan.depChanges.package.add.typescript).toBeDefined();
    }
  });

  test("diff: an extra dep not in the registry is reported as a remove", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    // The seed has `extra/dep: ^1.0.0` in composer.json. That
    // dep is NOT in the registry → plan.depChanges.composer
    // .remove.extra/dep === "^1.0.0".
    const removed = plan.depChanges.composer.remove["extra/dep"];
    expect(removed).toBe("^1.0.0");
  });

  test("diff: phpunit/phpunit range is a bump (old ^9.0.0 → new ^9.6.x)", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    const bumped =
      plan.depChanges.composer.bump["phpunit/phpunit"] ||
      // allow remove+add form
      (plan.depChanges.composer.remove["phpunit/phpunit"] &&
        plan.depChanges.composer.add["phpunit/phpunit"]);
    expect(bumped).toBeTruthy();
  });

  test("NO disk writes — files are byte-identical before vs after", async () => {
    // Snapshot the files we expect to be UNTOUCHED.
    const beforeManifest = readFileSync(
      path.join(tmpDir, "wpsk-kit.json"),
      "utf8",
    );
    const beforePackage = readFileSync(
      path.join(tmpDir, "package.json"),
      "utf8",
    );
    const beforeComposer = readFileSync(
      path.join(tmpDir, "composer.json"),
      "utf8",
    );

    const plan = planUpdate(tmpDir, "0.2.0");
    expect(plan.ok).toBe(true);

    // Every byte is unchanged. (The contract is "dry run —
    // no writes", and we prove it at the file level.)
    const afterManifest = readFileSync(
      path.join(tmpDir, "wpsk-kit.json"),
      "utf8",
    );
    const afterPackage = readFileSync(
      path.join(tmpDir, "package.json"),
      "utf8",
    );
    const afterComposer = readFileSync(
      path.join(tmpDir, "composer.json"),
      "utf8",
    );
    expect(afterManifest).toBe(beforeManifest);
    expect(afterPackage).toBe(beforePackage);
    expect(afterComposer).toBe(beforeComposer);
  });
});

describe("planUpdate() — already at or past target (Phase 24.7)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await seedProject({ kitVersion: "0.2.0" });
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("when manifest.kitVersion === toVersion, returns noop:true", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    expect(plan.ok).toBe(true);
    expect(plan.noop).toBe(true);
    expect(plan.current).toBe("0.2.0");
    // No migrations listed, no dep changes.
    expect(plan.migrations).toEqual([]);
    // depChanges is still present (the shape is fixed) but
    // the add / remove / bump maps are empty.
    expect(plan.depChanges.package.add).toEqual({});
    expect(plan.depChanges.package.remove).toEqual({});
    expect(plan.depChanges.package.bump).toEqual({});
    expect(plan.depChanges.composer.add).toEqual({});
    expect(plan.depChanges.composer.remove).toEqual({});
    expect(plan.depChanges.composer.bump).toEqual({});
  });

  test("when manifest.kitVersion > toVersion, also returns noop (no downgrade)", () => {
    // A user asking to "downgrade" from 0.2.0 to 0.1.0 — we
    // refuse silently (the installer's full update flow does
    // a stronger check). The dry-run reports "already at
    // 0.1.0" because the contract is "if to <= from, the
    // plan is a no-op".
    const plan = planUpdate(tmpDir, "0.1.0");
    expect(plan.ok).toBe(true);
    expect(plan.noop).toBe(true);
  });
});

describe("planUpdate() — missing manifest (Phase 24.7)", () => {
  test("returns {ok:false, reason} (does NOT throw)", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-plan-noman-"));
    try {
      const plan = planUpdate(dir, "0.2.0");
      expect(plan.ok).toBe(false);
      expect(typeof plan.reason).toBe("string");
      expect(plan.reason).toMatch(/no manifest/i);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("planUpdate() — missing dep files (Phase 24.8)", () => {
  let tmpDir;
  beforeEach(async () => {
    // Seed ONLY a manifest — no package.json / composer.json.
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-plan-nodeps-"));
    const manifest = {
      schema: 1,
      kitVersion: "0.1.0",
      distMode: "vendored",
      generatedAt: "2026-01-01T00:00:00.000Z",
      features: {},
    };
    await fs.writeFile(
      path.join(tmpDir, "wpsk-kit.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("when package.json and composer.json are absent, the plan still returns a valid shape", () => {
    const plan = planUpdate(tmpDir, "0.2.0");
    expect(plan.ok).toBe(true);
    // The kit's deps are reported as "add" (the consumer
    // doesn't have them; the update would install them).
    // The exact contents are dynamic (driven by
    // getDepVersions()), so we just assert presence + shape.
    expect(typeof plan.depChanges.package.add).toBe("object");
    expect(typeof plan.depChanges.composer.add).toBe("object");
    // remove / bump stay empty (nothing to remove or bump
    // from a project that had no deps).
    expect(plan.depChanges.package.remove).toEqual({});
    expect(plan.depChanges.composer.remove).toEqual({});
    expect(plan.depChanges.package.bump).toEqual({});
    expect(plan.depChanges.composer.bump).toEqual({});
  });
});
