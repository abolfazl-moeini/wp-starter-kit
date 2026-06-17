/**
 * Tests for `packages/cli/src/commands/add.js` — Phase I4
 * `wpsk add <feature>` (I4.3, I4.4, I4.5, I4.6).
 *
 * Contract (per plan.installer.md §I4.3–§I4.6):
 *   - `runAdd(input, deps)` validates the feature id against
 *     `engine.getFeatureCatalog()` BEFORE calling the engine.
 *     Unknown id → returns `{ok:false, reason}` listing the valid
 *     ids; engine is NOT called (the catalog is the source of
 *     truth for "is this a real feature").
 *   - With a known id, calls `engine.addFeature(dir, id, variant, opts)`
 *     exactly once. `variant` comes from the input (or the
 *     catalog default when the input does not specify it).
 *   - `opts.force` is `runOptions.force` (forwarded verbatim).
 *   - When the engine returns `{ok:true, deps, devDeps}` AND
 *     `runOptions.install === true`, calls
 *     `runners.npmInstall(dir, {verbose: runOptions.verbose})`
 *     and `runners.composerInstall(dir, {verbose: runOptions.verbose})`.
 *   - When `runOptions.install !== true`, NO runner is called
 *     even if the engine reported deps.
 *   - When the engine returns `{ok:false, reason}`, the function
 *     returns `{ok:false, reason}` verbatim and does NOT call
 *     any runner.
 *   - `runOptions.verbose` is forwarded to the runners when
 *     `runOptions.install` triggers them.
 *   - The function NEVER throws on engine errors.
 *
 * The "unknown id lists valid ids and exits non-zero" path is
 * the central I4.5 / I4.6 contract — it lives in this same
 * file so the validator and the engine-call are tested together
 * (an unknown id must short-circuit before the engine).
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runAdd } from "../../packages/cli/src/commands/add.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

const CATALOG = [
  {
    id: "js",
    variants: ["typescript", "pure", "flow", "none"],
    default: "typescript",
  },
  { id: "jsLib", variants: ["none", "preact", "react"], default: "none" },
  { id: "husky", variants: ["on", "off"], default: "on" },
  { id: "faultTolerance", variants: ["off", "on"], default: "off" },
  {
    id: "css",
    variants: ["none", "sass", "tailwind", "postcss"],
    default: "none",
  },
];

function makeEngine({
  ok = true,
  written = [],
  deps,
  devDeps,
  reason = "",
  doctor = { ok: true, warnings: [], errors: [] },
  manifest = { features: { css: "none" }, kitVersion: "0.1.0" },
} = {}) {
  return {
    getFeatureCatalog: jest.fn(() => CATALOG),
    readManifest: jest.fn(() => manifest),
    doctorProject: jest.fn(() => doctor),
    addFeature: jest.fn(async (..._args) => {
      if (!ok) return { ok: false, reason };
      return {
        ok: true,
        written,
        deps: deps || {},
        devDeps: devDeps || {},
      };
    }),
  };
}

function makeRunners() {
  return {
    npmInstall: jest.fn(async () => ({ ok: true })),
    composerInstall: jest.fn(async () => ({ ok: true })),
    gitInit: jest.fn(async () => ({ ok: true })),
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(() => []),
    log: jest.fn(async () => {}),
    confirm: jest.fn(async () => true), // not used in the runAdd happy path
  };
}

const baseDeps = () => ({
  engine: makeEngine(),
  runners: makeRunners(),
  ui: makeUi(),
});

/* -------------------------------------------------------------------- */
/* I4.3 — engine wiring                                                   */
/* -------------------------------------------------------------------- */

describe("runAdd — engine wiring (I4.3)", () => {
  test("calls engine.addFeature(dir, id, variant, {force}) once with a known id and explicit variant", async () => {
    const deps = baseDeps();
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { force: true },
      },
      deps,
    );
    expect(deps.engine.addFeature).toHaveBeenCalledTimes(1);
    expect(deps.engine.addFeature).toHaveBeenCalledWith(
      "/tmp/proj",
      "css",
      "tailwind",
      { force: true },
    );
    expect(out.ok).toBe(true);
  });

  test("uses the catalog default variant when the input does not specify one", async () => {
    const deps = baseDeps();
    await runAdd({ dir: "/tmp/proj", featureId: "css", runOptions: {} }, deps);
    const callArgs = deps.engine.addFeature.mock.calls[0];
    expect(callArgs[1]).toBe("css");
    // catalog default for `css` is "none"
    expect(callArgs[2]).toBe("none");
  });

  test("forwards runOptions.force as opts.force", async () => {
    const deps = baseDeps();
    await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "husky",
        variant: "on",
        runOptions: { force: false },
      },
      deps,
    );
    const opts = deps.engine.addFeature.mock.calls[0][3];
    expect(opts).toEqual({ force: false });
  });

  test("returns {ok:true, written} on engine success", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      written: ["postcss.config.js", "src/styles/main.css"],
    });
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "postcss",
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.written).toEqual(["postcss.config.js", "src/styles/main.css"]);
  });
});

/* -------------------------------------------------------------------- */
/* I4.3 — install gating                                                  */
/* -------------------------------------------------------------------- */

describe("runAdd — install gating (I4.3)", () => {
  test("with runOptions.install=false, NO runner is called even when engine reported deps", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      deps: { react: "18.0.0" },
      devDeps: { vitest: "1.0.0" },
    });
    await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { install: false },
      },
      deps,
    );
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
  });

  test("with runOptions.install=true, calls npmInstall + composerInstall (with verbose forwarded)", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({ deps: { lodash: "4.0.0" } });
    await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { install: true, verbose: true },
      },
      deps,
    );
    expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    expect(deps.runners.npmInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: true,
    });
    expect(deps.runners.composerInstall).toHaveBeenCalledTimes(1);
    expect(deps.runners.composerInstall).toHaveBeenCalledWith("/tmp/proj", {
      verbose: true,
    });
  });

  test("with runOptions.install=true but no deps from engine, runners are still called (user asked for them)", async () => {
    // The plan I4.3 wording is "if it returns deps to install AND
    // --install, calls the runners". The CLI delegates the gating
    // to the user: when --install is set, ALWAYS re-run the
    // installers. The engine's dep report is informational; the
    // install is a separate user decision.
    const deps = baseDeps();
    deps.engine = makeEngine({ deps: {}, devDeps: {} });
    await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { install: true },
      },
      deps,
    );
    expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    expect(deps.runners.composerInstall).toHaveBeenCalledTimes(1);
  });
});

/* -------------------------------------------------------------------- */
/* I4.4 — engine error surfacing                                          */
/* -------------------------------------------------------------------- */

describe("runAdd — engine error surfacing (I4.4)", () => {
  test("returns {ok:false, reason} when engine reports failure (does NOT throw, does NOT call runners)", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      ok: false,
      reason: 'faultTolerance requires phpMinVersion >= 8.1 (got "7.4")',
    });
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "faultTolerance",
        variant: "on",
        runOptions: { install: true },
      },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/faultTolerance requires phpMinVersion >= 8\.1/);
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
  });

  test("catches a thrown engine error and returns {ok:false}", async () => {
    const deps = baseDeps();
    deps.engine = {
      getFeatureCatalog: jest.fn(() => CATALOG),
      addFeature: jest.fn(async () => {
        throw new Error("EACCES: permission denied, open '/tmp/proj'");
      }),
    };
    const out = await runAdd(
      { dir: "/tmp/proj", featureId: "husky", variant: "on", runOptions: {} },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/EACCES/);
  });
});

/* -------------------------------------------------------------------- */
/* I4.5 / I4.6 — unknown id guard                                         */
/* -------------------------------------------------------------------- */

describe("runAdd — doctor gate (TASK-12a)", () => {
  test("prompts and aborts when doctor reports errors and user declines", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      doctor: { ok: false, warnings: [], errors: ["manifest missing"] },
    });
    deps.ui.confirm = jest.fn(async () => false);
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/cancelled due to doctor errors/);
    expect(deps.engine.addFeature).not.toHaveBeenCalled();
    expect(deps.ui.confirm).toHaveBeenCalled();
  });

  test("skips doctor prompt with --force and calls addFeature", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      doctor: { ok: false, warnings: [], errors: ["manifest missing"] },
    });
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { force: true },
      },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(deps.engine.addFeature).toHaveBeenCalledTimes(1);
    expect(deps.ui.confirm).not.toHaveBeenCalled();
  });

  test("continues when doctor reports errors and --yes is set", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      doctor: { ok: false, warnings: [], errors: ["manifest missing"] },
    });
    const out = await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "css",
        variant: "tailwind",
        runOptions: { yes: true },
      },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(deps.engine.addFeature).toHaveBeenCalledTimes(1);
    expect(deps.ui.confirm).not.toHaveBeenCalled();
  });
});

describe("runAdd — feature list (TASK-12c)", () => {
  test("runOptions.list delegates to runList without calling addFeature", async () => {
    const deps = baseDeps();
    deps.ui.renderFeatureTable = jest.fn(async () => {});
    const out = await runAdd(
      { dir: "/tmp/proj", featureId: "", runOptions: { list: true } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.rows).toBeDefined();
    expect(out.rows.length).toBe(CATALOG.length);
    expect(deps.engine.addFeature).not.toHaveBeenCalled();
    expect(deps.ui.renderFeatureTable).toHaveBeenCalled();
  });
});

describe("runAdd — unknown feature id (I4.5, I4.6)", () => {
  test("returns {ok:false, reason} that lists the valid ids; engine is NOT called", async () => {
    const deps = baseDeps();
    const out = await runAdd(
      { dir: "/tmp/proj", featureId: "not-a-real-feature", runOptions: {} },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/unknown feature/i);
    // Every catalog id appears in the reason so the user knows
    // the full valid set.
    for (const f of CATALOG) {
      expect(out.reason).toMatch(f.id);
    }
    // Engine is NOT called for an unknown id.
    expect(deps.engine.addFeature).not.toHaveBeenCalled();
    // Runners are NOT called either — we exited before any I/O.
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
  });
});
