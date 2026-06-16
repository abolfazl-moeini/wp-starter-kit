/**
 * Tests for `packages/cli/src/commands/update.js` — Phase I5
 * `wpsk update` dry-run (I5.1, I5.2).
 *
 * Contract (per plan.installer.md §I5.1 + I5.2):
 *   - `runUpdate({ argv, runOptions }, deps)` with the default
 *     `run:false` (dry-run) calls `engine.planUpdate(dir, toVersion)`
 *     with the resolved dir + the toVersion derived from
 *     `runOptions.target` (preferred) or the engine's
 *     `getDepVersions()` registry as a fallback.
 *   - On `{ok:true, noop:true}` the plan still renders as
 *     "no-op" (no migrations, no dep changes).
 *   - On `{ok:true, from, to, migrations, depChanges}` the plan
 *     is pretty-printed via `deps.ui.renderPlan`. The command
 *     does NOT call `runMigrations` on the dry-run path.
 *   - On `{ok:false, reason}` the command returns
 *     `{ok:false, reason}` and does NOT call `runMigrations`.
 *   - The function NEVER throws on engine errors.
 *   - The function accepts both a string `dir` and an
 *     `{dir, runOptions}` object.
 *
 * The apply path (`--run`) is exercised in `update.run.test.js`.
 * The 30+ Appendix A flags (including --run, --to, --force) are
 * the bin layer's responsibility; this test fixture wires the
 * resolved shape directly into `runUpdate(input, deps)`.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runUpdate } from "../../packages/cli/src/commands/update.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

/**
 * Build a fake engine with `planUpdate`, `runMigrations`, and
 * `getDepVersions` (the latter is used to default `to` when
 * `runOptions.target` is missing).
 */
function makeEngine({
  plan = null,
  runMigrationsResult = null,
  latest = "0.2.0",
} = {}) {
  const defaultPlan =
    plan !== null
      ? plan
      : {
          ok: true,
          from: "0.1.0",
          to: "0.2.0",
          migrations: [{ version: "0.2.0", description: "no-op baseline" }],
          depChanges: {
            package: { add: { lodash: "^4.0.0" }, remove: {}, bump: {} },
            composer: {
              add: {},
              remove: {},
              bump: { "phpunit/phpunit": { from: "^9.0", to: "^10.0" } },
            },
          },
        };
  return {
    planUpdate: jest.fn(() => defaultPlan),
    runMigrations: jest.fn(
      async () =>
        runMigrationsResult || {
          ok: true,
          ran: ["0.2.0"],
          from: "0.1.0",
          to: "0.2.0",
        },
    ),
    // A real getDepVersions returns a Map; tests use this fake to
    // control the "latest" version the command falls back to.
    getDepVersions: jest.fn(() => new Map([["_kit", latest]])),
  };
}

function makeRunners() {
  return {
    gitStatus: jest.fn(async () => ({ ok: true, dirty: false, files: [] })),
    npmInstall: jest.fn(async () => ({ ok: true })),
    composerInstall: jest.fn(async () => ({ ok: true })),
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    log: jest.fn(async () => {}),
    // The new plan renderer — tests assert it was called with
    // the right shape on success and was NOT called on errors.
    renderPlan: jest.fn(async (plan) => {
      return { called: true, plan };
    }),
  };
}

const baseDeps = () => ({
  engine: makeEngine(),
  runners: makeRunners(),
  ui: makeUi(),
});

/* -------------------------------------------------------------------- */
/* I5.1 — dry-run default + engine wiring                                 */
/* -------------------------------------------------------------------- */

describe("runUpdate — dry-run default (I5.1)", () => {
  test("with no runOptions.run, calls engine.planUpdate once and does NOT call runMigrations", async () => {
    const deps = baseDeps();
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { to: "0.2.0" } },
      deps,
    );
    expect(deps.engine.planUpdate).toHaveBeenCalledTimes(1);
    const [dir, to] = deps.engine.planUpdate.mock.calls[0];
    expect(dir).toBe("/tmp/proj");
    expect(to).toBe("0.2.0");
    // The dry-run path must NOT touch the engine's apply surface.
    expect(deps.engine.runMigrations).not.toHaveBeenCalled();
    expect(out.ok).toBe(true);
  });

  test("resolves the toVersion from runOptions.target (preferred) when provided", async () => {
    const deps = baseDeps();
    await runUpdate({ dir: "/tmp/proj", runOptions: { to: "9.9.9" } }, deps);
    const [, to] = deps.engine.planUpdate.mock.calls[0];
    expect(to).toBe("9.9.9");
  });

  test("accepts a string `dir` shorthand (bin-style call)", async () => {
    const deps = baseDeps();
    await runUpdate("/tmp/proj", deps);
    const [dir, to] = deps.engine.planUpdate.mock.calls[0];
    expect(dir).toBe("/tmp/proj");
    expect(typeof to).toBe("string");
  });

  test("accepts a {dir, runOptions} object", async () => {
    const deps = baseDeps();
    await runUpdate({ dir: "/tmp/proj", runOptions: { to: "0.3.0" } }, deps);
    const [dir, to] = deps.engine.planUpdate.mock.calls[0];
    expect(dir).toBe("/tmp/proj");
    expect(to).toBe("0.3.0");
  });

  test("returns {ok:false, reason} verbatim when planUpdate reports no manifest", async () => {
    const deps = baseDeps();
    deps.engine.planUpdate = jest.fn(() => ({
      ok: false,
      reason: "no manifest",
    }));
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/no manifest/);
    // Must NOT have rendered a plan — the user has no plan to see.
    expect(deps.ui.renderPlan).not.toHaveBeenCalled();
  });

  test("catches a thrown engine.planUpdate and returns {ok:false}", async () => {
    const deps = baseDeps();
    deps.engine.planUpdate = jest.fn(() => {
      throw new Error(
        "EACCES: permission denied, open '/tmp/proj/wpsk-kit.json'",
      );
    });
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { to: "0.2.0" } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/EACCES/);
  });

  test("returns {ok:false, reason} when dir is missing entirely", async () => {
    const deps = baseDeps();
    const out = await runUpdate(null, deps);
    expect(out.ok).toBe(false);
    expect(typeof out.reason).toBe("string");
  });
});

/* -------------------------------------------------------------------- */
/* I5.2 — pretty-print the plan via ui.renderPlan                          */
/* -------------------------------------------------------------------- */

describe("runUpdate — ui.renderPlan wiring (I5.2)", () => {
  test("on a successful plan, calls ui.renderPlan with the engine's plan object", async () => {
    const deps = baseDeps();
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
    deps.engine.planUpdate = jest.fn(() => PLAN);
    await runUpdate({ dir: "/tmp/proj", runOptions: { to: "0.2.0" } }, deps);
    expect(deps.ui.renderPlan).toHaveBeenCalledTimes(1);
    const [arg] = deps.ui.renderPlan.mock.calls[0];
    expect(arg).toEqual(PLAN);
  });

  test("on a noop plan, still calls ui.renderPlan (the user must see 'no migrations needed')", async () => {
    const deps = baseDeps();
    deps.engine.planUpdate = jest.fn(() => ({
      ok: true,
      noop: true,
      current: "0.2.0",
      migrations: [],
      depChanges: {
        package: { add: {}, remove: {}, bump: {} },
        composer: { add: {}, remove: {}, bump: {} },
      },
    }));
    await runUpdate({ dir: "/tmp/proj", runOptions: { to: "0.2.0" } }, deps);
    expect(deps.ui.renderPlan).toHaveBeenCalledTimes(1);
    const [arg] = deps.ui.renderPlan.mock.calls[0];
    expect(arg.noop).toBe(true);
    // Even on noop, runMigrations is not called.
    expect(deps.engine.runMigrations).not.toHaveBeenCalled();
  });

  test("returns the plan object in the result so the bin layer can chain (e.g. detect updateAvailable)", async () => {
    const deps = baseDeps();
    const PLAN = {
      ok: true,
      from: "0.1.0",
      to: "0.2.0",
      migrations: [],
      depChanges: {
        package: { add: {}, remove: {}, bump: {} },
        composer: { add: {}, remove: {}, bump: {} },
      },
    };
    deps.engine.planUpdate = jest.fn(() => PLAN);
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { to: "0.2.0" } },
      deps,
    );
    expect(out).toEqual(PLAN);
  });

  test("a throwing ui.renderPlan does NOT destroy the structured result (warning surfaced)", async () => {
    const deps = baseDeps();
    deps.ui.renderPlan = jest.fn(async () => {
      throw new Error("TTY closed");
    });
    const out = await runUpdate(
      { dir: "/tmp/proj", runOptions: { to: "0.2.0" } },
      deps,
    );
    // The plan is still returned so the bin layer / tests can
    // inspect it. The render error is reported as a warning.
    expect(out.ok).toBe(true);
    expect(out.warning).toMatch(/TTY closed/);
  });
});
