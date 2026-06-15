/**
 * Phase 24.5 / 24.6 — `runMigrations(dir, opts)` contract.
 *
 * The runner is the engine's "update a consumer project from
 * kit version A to version B" surface. The contract is locked
 * by these tests:
 *
 *  1. **Happy path** — `runMigrations(dir, { from:"0.1.0",
 *     to:"0.2.0" })` invokes the 0.2.0 migration's `run(dir)`,
 *     then bumps the manifest's `kitVersion` to "0.2.0".
 *
 *  2. **Idempotency** — a second call with the same `to` is
 *     a no-op: the manifest is already at "0.2.0", the runner
 *     returns `{ok:true, alreadyCurrent:true, ran:[]}` and
 *     does NOT re-run the migration.
 *
 *  3. **project.config.json edit persists** — a migration can
 *     use `updateJsonFile` to patch `project.config.json`; the
 *     change is on disk after the run completes, and the
 *     manifest's `kitVersion` is also bumped.
 *
 *  4. **Failing migration aborts** — a migration that throws
 *     (or returns `{ok:false}`) halts the chain at THAT
 *     version, returns `{ok:false, failedAt: <version>}`,
 *     and the manifest's `kitVersion` is NOT bumped (the
 *     manifest is the source of truth, so a partial run
 *     leaves the project at its PRE-migration state).
 *
 *  5. **No manifest** — `runMigrations(dir, ...)` on a directory
 *     with no `wpsk-kit.json` returns `{ok:false, reason: ...}`
 *     and does NOT throw.
 *
 *  6. **project.config.json mirror** — when a manifest bump
 *     lands on a project that HAS a `project.config.json`, the
 *     mirror's `kitVersion` is also updated (per the dual-write
 *     contract in `syncFeaturesToConfig`).
 *
 * The test uses an isolated tmpdir per case so runs are
 * independent and the on-disk state can be asserted directly
 * with `fs.readFileSync` / `JSON.parse` after the runner
 * returns. The 0.2.0 baseline migration is the registered
 * "migration under test" for the happy path / idempotency
 * cases; for the failing-migration cases, we use Jest's
 * `jest.unstable_mockModule` to swap the 0.2.0 module for a
 * failing one.
 *
 * Note (RED→GREEN status): this file is written against the
 * already-shipped implementation in `src/migrations/index.js`
 * (the registry, selector, and runner were co-designed in
 * Phase 24.1–24.6 — the same commit ships the test and the
 * code). All cases pass against the shipped implementation.
 * This is a "lock-in" suite, not a TDD walk. If a future
 * regression breaks a case, the test will fail and the fix
 * is straightforward.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// Capture the original import so a failing-migration test can
// restore it after mutating the module cache.
import * as migrationsModule from "../../packages/create-wp-project/src/migrations/index.js";
import { readManifest } from "../../packages/create-wp-project/src/manifest.js";

const { runMigrations } = migrationsModule;

describe("runMigrations() — happy path (Phase 24.5, 24.6)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-mig-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("creates a manifest-less project dir → returns {ok:false, reason:'no manifest'}", async () => {
    const res = await runMigrations(tmpDir, { from: "0.1.0", to: "0.2.0" });
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/no manifest/);
  });

  test("with manifest at 0.1.0, runs the 0.2.0 migration and bumps the manifest", async () => {
    // Seed the project with a 0.1.0 manifest.
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

    // Spy on the 0.2.0 migration's run by reading it from the
    // registry and wrapping it. The runner uses the same module
    // instance the test sees via `getMigrations()`, so wrapping
    // the descriptor in the registry is the only way to count
    // invocations without rewriting the module system.
    const { getMigrations } = migrationsModule;
    const baseline = getMigrations().find((m) => m.version === "0.2.0");
    expect(baseline).toBeTruthy();
    const originalRun = baseline.run;
    let calls = 0;
    baseline.run = async function (dir) {
      calls += 1;
      // Verify the runner passed the project dir to the migration.
      expect(dir).toBe(tmpDir);
      return originalRun.call(this, dir);
    };

    try {
      const res = await runMigrations(tmpDir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(true);
      expect(calls).toBe(1);
      expect(res.ran).toEqual(["0.2.0"]);
      expect(res.from).toBe("0.1.0");
      expect(res.to).toBe("0.2.0");
      expect(res.alreadyCurrent).toBeUndefined();

      // Manifest on disk is bumped to 0.2.0.
      const after = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(after.kitVersion).toBe("0.2.0");
    } finally {
      baseline.run = originalRun;
    }
  });
});

describe("runMigrations() — idempotency (Phase 24.5, 24.6)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-mig-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("a second call with the SAME args is a no-op (alreadyCurrent)", async () => {
    // Spec: "A second call with the same args is a no-op
    // (manifest already at 0.2.0)." This is the actual
    // idempotency contract: run with the same {from,to} twice
    // and the second call must NOT re-run the migration.
    //
    // Set up:
    //   - Seed a 0.1.0 manifest.
    //   - Wrap the 0.2.0 run to count invocations.
    //   - First call: { from:"0.1.0", to:"0.2.0" } → runs 0.2.0,
    //     bumps manifest to 0.2.0.
    //   - Second call: SAME args, { from:"0.1.0", to:"0.2.0" }
    //     → detects the manifest is already at 0.2.0, returns
    //     alreadyCurrent:true, runs the migration zero times.
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

    const { getMigrations } = migrationsModule;
    const baseline = getMigrations().find((m) => m.version === "0.2.0");
    const originalRun = baseline.run;
    let calls = 0;
    baseline.run = async function (dir) {
      calls += 1;
      return originalRun.call(this, dir);
    };

    try {
      // First call — actually applies the 0.2.0 migration.
      const first = await runMigrations(tmpDir, {
        from: "0.1.0",
        to: "0.2.0",
      });
      expect(first.ok).toBe(true);
      expect(first.alreadyCurrent).toBeUndefined();
      expect(calls).toBe(1);
      const afterFirst = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(afterFirst.kitVersion).toBe("0.2.0");

      // Second call — SAME args. The manifest is now at 0.2.0,
      // so the runner must short-circuit and NOT re-run the
      // migration. The runner still passes `from: "0.1.0"`
      // (the caller's intent), but the manifest check
      // (kitVersion >= to) is what triggers the no-op.
      const second = await runMigrations(tmpDir, {
        from: "0.1.0",
        to: "0.2.0",
      });
      expect(second.ok).toBe(true);
      expect(second.alreadyCurrent).toBe(true);
      expect(second.ran).toEqual([]);
      expect(calls).toBe(1); // unchanged — no second invocation

      // Manifest is still 0.2.0 (no double-bump).
      const afterSecond = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(afterSecond.kitVersion).toBe("0.2.0");
    } finally {
      baseline.run = originalRun;
    }
  });

  test("a no-op `from` is inferred from the manifest when omitted", async () => {
    // Seed a 0.1.0 manifest, then call without `from`. The
    // runner reads the manifest, sees 0.1.0, runs the 0.2.0
    // migration, and bumps to 0.2.0.
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

    const res = await runMigrations(tmpDir, { to: "0.2.0" });
    expect(res.ok).toBe(true);
    expect(res.from).toBe("0.1.0");
    expect(res.to).toBe("0.2.0");
    expect(res.ran).toEqual(["0.2.0"]);

    const after = JSON.parse(
      await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
    );
    expect(after.kitVersion).toBe("0.2.0");
  });
});

describe("runMigrations() — project.config.json edit persists (Phase 24.5, 24.6)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-mig-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("a migration can use updateJsonFile on project.config.json; the change persists", async () => {
    // Seed a 0.1.0 manifest AND a v2-shape project.config.json.
    const manifest = {
      schema: 1,
      kitVersion: "0.1.0",
      distMode: "vendored",
      generatedAt: "2026-01-01T00:00:00.000Z",
      features: {},
    };
    const projectConfig = {
      slug: "wpsk-project",
      globalName: "WpskProject",
      uiFramework: "preact",
      projectType: "plugin",
    };
    await fs.writeFile(
      path.join(tmpDir, "wpsk-kit.json"),
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmpDir, "project.config.json"),
      JSON.stringify(projectConfig, null, 2) + "\n",
      "utf8",
    );

    // Wrap the 0.2.0 migration to ALSO edit project.config.json
    // via the documented updateJsonFile helper. The change
    // should persist across the run, and the manifest's
    // kitVersion should also bump.
    const { getMigrations } = migrationsModule;
    const { updateJsonFile } =
      await import("../../packages/create-wp-project/src/json-utils.js");
    const baseline = getMigrations().find((m) => m.version === "0.2.0");
    const originalRun = baseline.run;
    baseline.run = async function (dir) {
      // Edit project.config.json before returning ok.
      await updateJsonFile(path.join(dir, "project.config.json"), (cfg) => {
        cfg.addedByMigration = "0.2.0";
        return cfg;
      });
      return originalRun.call(this, dir);
    };

    try {
      const res = await runMigrations(tmpDir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(true);

      // Manifest is bumped.
      const afterManifest = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(afterManifest.kitVersion).toBe("0.2.0");

      // project.config.json carries BOTH the migration's edit
      // AND the kitVersion mirror.
      const afterCfg = JSON.parse(
        await fs.readFile(path.join(tmpDir, "project.config.json"), "utf8"),
      );
      expect(afterCfg.addedByMigration).toBe("0.2.0");
      expect(afterCfg.kitVersion).toBe("0.2.0");
    } finally {
      baseline.run = originalRun;
    }
  });
});

describe("runMigrations() — failing migration aborts (Phase 24.6)", () => {
  let tmpDir;
  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-mig-"));
  });
  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  test("a throwing migration halts the chain and the manifest is NOT bumped", async () => {
    // Seed a 0.1.0 manifest.
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

    // Wrap the 0.2.0 migration to throw.
    const { getMigrations } = migrationsModule;
    const baseline = getMigrations().find((m) => m.version === "0.2.0");
    const originalRun = baseline.run;
    baseline.run = async function () {
      throw new Error("boom: simulated 0.2.0 failure");
    };

    try {
      const res = await runMigrations(tmpDir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(false);
      expect(res.failedAt).toBe("0.2.0");
      expect(res.reason).toMatch(/boom/);

      // Manifest is NOT bumped — it still reads 0.1.0.
      const after = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(after.kitVersion).toBe("0.1.0");
    } finally {
      baseline.run = originalRun;
    }
  });

  test("a {ok:false}-returning migration also halts and does not bump", async () => {
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

    const { getMigrations } = migrationsModule;
    const baseline = getMigrations().find((m) => m.version === "0.2.0");
    const originalRun = baseline.run;
    baseline.run = async function () {
      return { ok: false, reason: "soft fail from 0.2.0" };
    };

    try {
      const res = await runMigrations(tmpDir, { from: "0.1.0", to: "0.2.0" });
      expect(res.ok).toBe(false);
      expect(res.failedAt).toBe("0.2.0");
      expect(res.reason).toMatch(/soft fail/);

      const after = JSON.parse(
        await fs.readFile(path.join(tmpDir, "wpsk-kit.json"), "utf8"),
      );
      expect(after.kitVersion).toBe("0.1.0");
    } finally {
      baseline.run = originalRun;
    }
  });
});

describe("runMigrations() — argument validation (Phase 24.6)", () => {
  test("throws on missing dir", async () => {
    await expect(runMigrations("", { to: "0.2.0" })).rejects.toThrow();
    await expect(runMigrations(null, { to: "0.2.0" })).rejects.toThrow();
  });

  test("throws on missing to", async () => {
    await expect(runMigrations("/tmp", { from: "0.1.0" })).rejects.toThrow();
  });
});
