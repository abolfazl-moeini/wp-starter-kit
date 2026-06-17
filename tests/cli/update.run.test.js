/**
 * Tests for `packages/cli/src/commands/update.js` — Phase I5
 * `wpdev update --run` (I5.3, I5.4).
 *
 * Contract (per plan.installer.md §I5.3 + I5.4):
 *   - `runUpdate({runOptions:{run:true, ...}}, deps)`:
 *       1. Calls `engine.planUpdate` (the dry-run).
 *       2. Renders the plan via `deps.ui.renderPlan`.
 *       3. Calls `runners.gitStatus(dir)` BEFORE applying. If
 *          git is dirty and `runOptions.force !== true`, the
 *          command aborts with `{ok:false, reason}` and does
 *          NOT call `runMigrations`.
 *       4. On a clean tree (or when `force:true`), calls
 *          `engine.runMigrations(dir, {from, to})`.
 *       5. After a successful migration, calls
 *          `runners.npmInstall(dir, {verbose})` and
 *          `runners.composerInstall(dir, {verbose})`.
 *   - On a `{ok:false}` from `runMigrations` the command
 *     surfaces the engine's reason and does NOT call the
 *     installers.
 *   - `--verbose` is forwarded to the runners.
 *   - The function NEVER throws on engine errors.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runUpdate } from "../../packages/cli/src/commands/update.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

const PLAN = {
  ok: true,
  from: "0.1.0",
  to: "0.2.0",
  migrations: [{ version: "0.2.0", description: "no-op baseline" }],
  depChanges: {
    package: { add: {}, remove: {}, bump: {} },
    composer: { add: {}, remove: {}, bump: {} },
  },
};

function makeEngine({ runMigrationsResult = null } = {}) {
  return {
    planUpdate: jest.fn(() => PLAN),
    runMigrations: jest.fn(
      async () =>
        runMigrationsResult || {
          ok: true,
          ran: ["0.2.0"],
          from: "0.1.0",
          to: "0.2.0",
        },
    ),
    getDepVersions: jest.fn(() => new Map()),
  };
}

function makeRunners({ gitStatus = null } = {}) {
  return {
    gitStatus:
      gitStatus || jest.fn(async () => ({ ok: true, dirty: false, files: [] })),
    npmInstall: jest.fn(async () => ({ ok: true })),
    composerInstall: jest.fn(async () => ({ ok: true })),
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    log: jest.fn(async () => {}),
    renderPlan: jest.fn(async () => {}),
  };
}

const baseDeps = (overrides = {}) => ({
  engine: overrides.engine || makeEngine(),
  runners: overrides.runners || makeRunners(),
  ui: overrides.ui || makeUi(),
});

/* -------------------------------------------------------------------- */
/* I5.3 — apply path: plan + renderPlan + runMigrations                   */
/* -------------------------------------------------------------------- */

describe("runUpdate — apply path (I5.3)", () => {
  test("with run:true, calls engine.runMigrations(dir, {from, to}) on a clean tree", async () => {
    const deps = baseDeps();
    await runUpdate(
      {
        dir: "/tmp/proj",
        runOptions: { run: true, to: "0.2.0" },
      },
      deps,
    );
    expect(deps.engine.runMigrations).toHaveBeenCalledTimes(1);
    const [dir, opts] = deps.engine.runMigrations.mock.calls[0];
    expect(dir).toBe("/tmp/proj");
    expect(opts.from).toBe("0.1.0");
    expect(opts.to).toBe("0.2.0");
  });

  test("with run:true, calls ui.renderPlan (the user sees the plan before it is applied)", async () => {
    const deps = baseDeps();
    await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(deps.ui.renderPlan).toHaveBeenCalledTimes(1);
  });

  test("with run:true, calls runners.gitStatus BEFORE engine.runMigrations", async () => {
    const deps = baseDeps();
    const calls = [];
    deps.runners.gitStatus = jest.fn(async () => {
      calls.push("git");
      return { ok: true, dirty: false, files: [] };
    });
    deps.engine.runMigrations = jest.fn(async () => {
      calls.push("run");
      return { ok: true, ran: ["0.2.0"], from: "0.1.0", to: "0.2.0" };
    });
    await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(calls).toEqual(["git", "run"]);
  });

  test("returns the runMigrations result on success", async () => {
    const deps = baseDeps();
    const R = {
      ok: true,
      ran: ["0.2.0"],
      from: "0.1.0",
      to: "0.2.0",
    };
    deps.engine.runMigrations = jest.fn(async () => R);
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.ran).toEqual(["0.2.0"]);
  });
});

/* -------------------------------------------------------------------- */
/* I5.4 — git-dirty guard + force                                          */
/* -------------------------------------------------------------------- */

describe("runUpdate — git-dirty guard (I5.4)", () => {
  test("aborts with {ok:false, reason} when git is dirty and force is NOT set", async () => {
    const deps = baseDeps();
    deps.runners.gitStatus = jest.fn(async () => ({
      ok: true,
      dirty: true,
      files: ["src/Plugin.php", "package.json"],
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/dirty/i);
    // The hard guard: runMigrations is NOT called on a dirty
    // tree without --force.
    expect(deps.engine.runMigrations).not.toHaveBeenCalled();
  });

  test("force:true bypasses the git-dirty guard", async () => {
    const deps = baseDeps();
    deps.runners.gitStatus = jest.fn(async () => ({
      ok: true,
      dirty: true,
      files: ["src/Plugin.php"],
    }));
    const out = await runUpdate(
      {
        dir: "/tmp/proj",
        runOptions: { run: true, to: "0.2.0", force: true },
      },
      deps,
    );
    expect(deps.engine.runMigrations).toHaveBeenCalledTimes(1);
    expect(out.ok).toBe(true);
  });

  test("when gitStatus reports an error (not ok), the command aborts (defensive — refuse to apply on unknown git state)", async () => {
    const deps = baseDeps();
    deps.runners.gitStatus = jest.fn(async () => ({
      ok: false,
      error: "git not found",
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/git/i);
    expect(deps.engine.runMigrations).not.toHaveBeenCalled();
  });

  test("when git is clean, applies the migrations", async () => {
    const deps = baseDeps();
    deps.runners.gitStatus = jest.fn(async () => ({
      ok: true,
      dirty: false,
      files: [],
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(deps.engine.runMigrations).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------- */
/* I5.4 — install step after migrations                                    */
/* -------------------------------------------------------------------- */

describe("runUpdate — install after apply (I5.4)", () => {
  test("on successful apply, calls runners.npmInstall and runners.composerInstall", async () => {
    const deps = baseDeps();
    await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    expect(deps.runners.npmInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: false,
    });
    expect(deps.runners.composerInstall).toHaveBeenCalledTimes(1);
    expect(deps.runners.composerInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: false,
    });
  });

  test("forwards runOptions.verbose to the runners", async () => {
    const deps = baseDeps();
    await runUpdate(
      {
        dir: "/tmp/proj",
        runOptions: { run: true, to: "0.2.0", verbose: true },
      },
      deps,
    );
    expect(deps.runners.npmInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: true,
    });
    expect(deps.runners.composerInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: true,
    });
  });

  test("on a failed runMigrations, the installers are NOT called (the migration is what the user asked for)", async () => {
    const deps = baseDeps();
    deps.engine.runMigrations = jest.fn(async () => ({
      ok: false,
      reason: "migration 0.2.0 failed: EACCES",
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
  });

  test("a runner skipped/error is surfaced as a warning, not a hard error", async () => {
    // The runners are best-effort: the migration is the user's
    // intent, the install is a follow-up. A network failure
    // during `npm install` must not make the whole update
    // fail — the migration already succeeded.
    const deps = baseDeps();
    deps.runners.npmInstall = jest.fn(async () => ({
      ok: false,
      skipped: true,
      reason: "npm not found on PATH — skipping npm install",
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.warning).toMatch(/npm/);
  });
});

/* -------------------------------------------------------------------- */
/* Apply path — error surfacing                                            */
/* -------------------------------------------------------------------- */

describe("runUpdate — error surfacing on the apply path", () => {
  test("catches a thrown engine.runMigrations and returns {ok:false}", async () => {
    const deps = baseDeps();
    deps.engine.runMigrations = jest.fn(async () => {
      throw new Error("disk full");
    });
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { run: true, to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/disk full/);
  });
});
