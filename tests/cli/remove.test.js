/**
 * Tests for `packages/cli/src/commands/remove.js` — Phase I4
 * `wpdev remove <feature>` (I4.7, I4.8).
 *
 * Contract (per plan.installer.md §I4.7 + §I4.8):
 *   - `runRemove(input, deps)` calls
 *     `engine.removeFeature(dir, id, {force})` exactly once.
 *   - Refuses to remove the always-on `core` feature with a clear
 *     error BEFORE calling the engine.
 *   - Confirmation is required UNLESS `runOptions.yes === true`.
 *     The confirmation is wired through `ui.confirm` (the
 *     clack-backed wrapper).
 *   - `runOptions.force` is forwarded as `opts.force` on the
 *     engine call.
 *   - Engine `{ok:false, reason}` is surfaced as
 *     `{ok:false, reason}` on the runRemove result; runners are
 *     not called.
 *   - Engine `{ok:true, removed, manifest}` is surfaced as
 *     `{ok:true, removed}`.
 *   - The function NEVER throws on engine errors.
 *
 * The "refuses core" rule is the central safety guard. It lives
 * in this same file because it is a precondition of the
 * engine.call() path.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runRemove } from "../../packages/cli/src/commands/remove.js";

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
  { id: "i18n", variants: ["on", "off"], default: "on" },
];

function makeEngine({ ok = true, removed = [], reason = "" } = {}) {
  return {
    getFeatureCatalog: jest.fn(() => CATALOG),
    removeFeature: jest.fn(async (..._args) => {
      if (!ok) return { ok: false, reason };
      return { ok: true, written: false, removed, manifest: {} };
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

function makeUi({ confirmReturn = true } = {}) {
  return {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(() => []),
    log: jest.fn(async () => {}),
    confirm: jest.fn(async (_opts) => confirmReturn),
  };
}

const baseDeps = (overrides = {}) => ({
  engine: makeEngine(),
  runners: makeRunners(),
  ui: makeUi(),
  ...overrides,
});

/* -------------------------------------------------------------------- */
/* I4.7 — engine wiring                                                   */
/* -------------------------------------------------------------------- */

describe("runRemove — engine wiring (I4.7)", () => {
  test("calls engine.removeFeature(dir, id, {force}) exactly once with a known id", async () => {
    const deps = baseDeps();
    const out = await runRemove(
      {
        dir: "/tmp/proj",
        featureId: "husky",
        runOptions: { yes: true, force: true },
      },
      deps,
    );
    expect(deps.engine.removeFeature).toHaveBeenCalledTimes(1);
    expect(deps.engine.removeFeature).toHaveBeenCalledWith(
      "/tmp/proj",
      "husky",
      { force: true },
    );
    expect(out.ok).toBe(true);
  });

  test("returns {ok:true, removed} on engine success", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      removed: [".husky/pre-commit", ".husky/_/husky.sh"],
    });
    const out = await runRemove(
      { dir: "/tmp/proj", featureId: "husky", runOptions: { yes: true } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.removed).toEqual([".husky/pre-commit", ".husky/_/husky.sh"]);
  });

  test("forwards runOptions.force as opts.force", async () => {
    const deps = baseDeps();
    await runRemove(
      {
        dir: "/tmp/proj",
        featureId: "i18n",
        runOptions: { yes: true, force: false },
      },
      deps,
    );
    const opts = deps.engine.removeFeature.mock.calls[0][2];
    expect(opts).toEqual({ force: false });
  });

  test("returns {ok:false, reason} when engine reports failure (does NOT throw)", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      ok: false,
      reason: "husky is not in the manifest",
    });
    const out = await runRemove(
      { dir: "/tmp/proj", featureId: "husky", runOptions: { yes: true } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/husky is not in the manifest/);
  });
});

/* -------------------------------------------------------------------- */
/* I4.7 — refuses to remove always-on `core`                              */
/* -------------------------------------------------------------------- */

describe("runRemove — always-on `core` guard (I4.7)", () => {
  test("returns {ok:false, reason} when featureId === 'core'; engine is NOT called", async () => {
    const deps = baseDeps();
    const out = await runRemove(
      { dir: "/tmp/proj", featureId: "core", runOptions: { yes: true } },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/core/i);
    expect(out.reason).toMatch(/always[- ]on|cannot be removed/i);
    expect(deps.engine.removeFeature).not.toHaveBeenCalled();
  });
});

/* -------------------------------------------------------------------- */
/* I4.8 — confirmation gate (--yes)                                       */
/* -------------------------------------------------------------------- */

describe("runRemove — config-only pre-filter (Phase 3)", () => {
  test("license returns skipped with helpful set message (exit 0 path)", async () => {
    const catalog = [
      ...CATALOG,
      { id: "license", variants: ["gpl2", "gpl3", "mit"], default: "gpl2" },
      { id: "phpMinVersion", variants: ["7.4", "8.2"], default: "7.4" },
    ];
    const deps = baseDeps();
    deps.engine.getFeatureCatalog = jest.fn(() => catalog);
    const out = await runRemove(
      { dir: "/tmp/proj", featureId: "license", runOptions: { yes: true } },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.skipped).toBe(true);
    expect(out.reason).toMatch(/wpdev set license/i);
    expect(deps.engine.removeFeature).not.toHaveBeenCalled();
  });
});

describe("runRemove — confirmation gate (I4.8)", () => {
  test("with runOptions.yes=true, ui.confirm is NOT called and the engine IS called", async () => {
    const deps = baseDeps();
    await runRemove(
      { dir: "/tmp/proj", featureId: "husky", runOptions: { yes: true } },
      deps,
    );
    expect(deps.ui.confirm).not.toHaveBeenCalled();
    expect(deps.engine.removeFeature).toHaveBeenCalledTimes(1);
  });

  test("with runOptions.yes=false (or unset), ui.confirm IS called; engine runs only if confirm returns true", async () => {
    const deps = baseDeps({ ui: makeUi({ confirmReturn: true }) });
    await runRemove(
      { dir: "/tmp/proj", featureId: "husky", runOptions: {} },
      deps,
    );
    expect(deps.ui.confirm).toHaveBeenCalledTimes(1);
    // The confirm message mentions the feature id being removed so
    // the user has a clear "are you sure?" prompt.
    const confirmOpts = deps.ui.confirm.mock.calls[0][0];
    expect(confirmOpts.message).toMatch(/husky/);
    expect(deps.engine.removeFeature).toHaveBeenCalledTimes(1);
  });

  test("with runOptions.yes unset and confirm returns false, returns {ok:false, reason} and engine is NOT called", async () => {
    const deps = baseDeps({ ui: makeUi({ confirmReturn: false }) });
    const out = await runRemove(
      { dir: "/tmp/proj", featureId: "husky", runOptions: {} },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/cancel/i);
    expect(deps.engine.removeFeature).not.toHaveBeenCalled();
  });
});
