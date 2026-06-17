/**
 * Tests for `packages/cli/src/commands/info.js` — Phase I5
 * `wpdev info` (I5.7, I5.8).
 *
 * Contract (per plan.installer.md §I5.7 + §I5.8):
 *   - `runInfo(input, deps)` resolves the dir from the input
 *     (string shorthand or `{ dir, runOptions: { json, dir } }`).
 *   - Calls `deps.engine.getKitStatus(dir, { lookupLatest })` with
 *     the injected `lookupLatest` (default = the bin's real
 *     `npm view @wpdev/cli version` shim; tests inject a fake).
 *   - When the engine returns `{ok:false, reason}`, the command
 *     returns `{ok:false, reason}` verbatim and does NOT print
 *     the info panel. The bin layer uses this to exit non-zero.
 *   - When the engine returns `{ok:true, kitVersion, distMode,
 *     features, path, latestKitVersion?, updateAvailable?}`,
 *     the command delegates pretty-printing to
 *     `deps.ui.renderKitStatus(status, { json })`. With
 *     `json:true` the ui helper is expected to print the raw
 *     JSON object; with `json:false` (default) it prints the
 *     panel.
 *   - `updateAvailable === true` is the signal to print the
 *     "X.Y.Z available" line in yellow. The engine already
 *     computes the boolean; the ui helper applies the color.
 *   - The function NEVER throws on engine errors.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runInfo } from "../../packages/cli/src/commands/info.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

/**
 * Build a fake `engine.getKitStatus` that returns a fixed status.
 * Tests customize the `status` value to drive the assertions.
 */
function makeEngine({ status = null, getKitStatus = null } = {}) {
  const fn =
    getKitStatus ||
    jest.fn(async (_dir, _opts) =>
      status === null
        ? { ok: false, reason: "no manifest at /tmp/proj" }
        : status,
    );
  return {
    getKitStatus: fn,
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(async () => []),
    renderFeatureTable: jest.fn(async () => {}),
    // The new info helper — tests assert it was called with the
    // right (status, opts) shape.
    renderKitStatus: jest.fn(async (s, opts) => {
      return { called: true, status: s, opts: opts || {} };
    }),
    log: jest.fn(async () => {}),
  };
}

const baseDeps = ({ status = null } = {}) => ({
  engine: makeEngine({ status }),
  ui: makeUi(),
  // A controlled fake so tests can assert it was forwarded to
  // engine.getKitStatus as `opts.lookupLatest`.
  lookupLatestKit: jest.fn(async (cur) => "9.9.9-fake(" + cur + ")"),
});

/**
 * A canned "happy path" status mirroring what the real
 * `engine.getKitStatus` returns. Tests can spread + override
 * fields.
 */
const HAPPY = {
  ok: true,
  kitVersion: "0.1.0",
  distMode: "npm",
  features: {
    js: "typescript",
    jsLib: "none",
    husky: "on",
    i18n: "on",
  },
  path: "/abs/project",
};

/* -------------------------------------------------------------------- */
/* I5.7 — engine wiring (lookupLatest forwarded, result returned)        */
/* -------------------------------------------------------------------- */

describe("runInfo — engine wiring (I5.7)", () => {
  test("calls engine.getKitStatus with the resolved dir and the injected lookupLatest", async () => {
    const deps = baseDeps({ status: HAPPY });
    await runInfo("/tmp/proj", deps);
    expect(deps.engine.getKitStatus).toHaveBeenCalledTimes(1);
    const [dir, opts] = deps.engine.getKitStatus.mock.calls[0];
    expect(dir).toBe("/tmp/proj");
    expect(typeof opts).toBe("object");
    expect(opts.lookupLatest).toBe(deps.lookupLatestKit);
  });

  test("forwards a string dir shortcut (bin-style call) AND a {dir, runOptions} object", async () => {
    // String dir (bin layer convenience).
    const deps1 = baseDeps({ status: HAPPY });
    await runInfo("/tmp/a", deps1);
    expect(deps1.engine.getKitStatus.mock.calls[0][0]).toBe("/tmp/a");

    // Object form (the bin layer actually passes this; tests
    // use the string form for simplicity, but the contract
    // must accept the object form too).
    const deps2 = baseDeps({ status: HAPPY });
    await runInfo({ dir: "/tmp/b", runOptions: {} }, deps2);
    expect(deps2.engine.getKitStatus.mock.calls[0][0]).toBe("/tmp/b");
  });

  test("returns the engine status verbatim on success", async () => {
    const deps = baseDeps({ status: HAPPY });
    const out = await runInfo("/tmp/proj", deps);
    expect(out).toEqual(HAPPY);
  });

  test("returns {ok:false, reason} verbatim when the engine reports no manifest", async () => {
    const FAIL = { ok: false, reason: "no manifest at /tmp/proj" };
    const deps = baseDeps({ status: FAIL });
    const out = await runInfo("/tmp/proj", deps);
    expect(out).toEqual(FAIL);
  });

  test("does NOT call ui.renderKitStatus when the engine returns {ok:false}", async () => {
    const deps = baseDeps({
      status: { ok: false, reason: "no manifest at /tmp/proj" },
    });
    await runInfo("/tmp/proj", deps);
    expect(deps.ui.renderKitStatus).not.toHaveBeenCalled();
  });

  test("catches a thrown engine.getKitStatus and returns {ok:false}", async () => {
    const deps = baseDeps();
    deps.engine.getKitStatus = jest.fn(async () => {
      throw new Error("disk full");
    });
    const out = await runInfo("/tmp/proj", deps);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/disk full/);
  });

  test("returns {ok:false, reason} when dir is missing entirely", async () => {
    const deps = baseDeps({ status: HAPPY });
    const out = await runInfo(null, deps);
    expect(out.ok).toBe(false);
    expect(typeof out.reason).toBe("string");
  });

  test("returns {ok:false, reason} when engine.getKitStatus is not injected", async () => {
    const deps = { engine: {}, ui: makeUi(), lookupLatestKit: jest.fn() };
    const out = await runInfo("/tmp/proj", deps);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/getKitStatus/);
  });
});

/* -------------------------------------------------------------------- */
/* I5.8 — ui.renderKitStatus wiring + --json                              */
/* -------------------------------------------------------------------- */

describe("runInfo — ui.renderKitStatus + --json (I5.8)", () => {
  test("calls ui.renderKitStatus with the engine status on success (json:false by default)", async () => {
    const deps = baseDeps({ status: HAPPY });
    await runInfo("/tmp/proj", deps);
    expect(deps.ui.renderKitStatus).toHaveBeenCalledTimes(1);
    const [status, opts] = deps.ui.renderKitStatus.mock.calls[0];
    expect(status).toEqual(HAPPY);
    expect(opts && opts.json).toBe(false);
  });

  test("forwards json:true when runOptions.json is true", async () => {
    const deps = baseDeps({ status: HAPPY });
    await runInfo({ dir: "/tmp/proj", runOptions: { json: true } }, deps);
    const [, opts] = deps.ui.renderKitStatus.mock.calls[0];
    expect(opts.json).toBe(true);
  });

  test("forwards json:true when --json is in the input's argv (parseFlags-style)", async () => {
    // The bin layer hands the raw argv to the command; we keep
    // the parsing local (per-command) so we don't need a global
    // flag registry. This test locks the parse step: a
    // runInfo(input, deps) with `{argv:["--json"]}` should
    // produce the same json:true signal as runOptions.json.
    const deps = baseDeps({ status: HAPPY });
    await runInfo({ dir: "/tmp/proj", runOptions: {}, argv: ["--json"] }, deps);
    const [, opts] = deps.ui.renderKitStatus.mock.calls[0];
    expect(opts.json).toBe(true);
  });

  test("the updateAvailable signal flows from engine → ui (yellow is the ui's call)", async () => {
    const NEWER = {
      ...HAPPY,
      latestKitVersion: "0.2.0",
      updateAvailable: true,
    };
    const deps = baseDeps({ status: NEWER });
    await runInfo("/tmp/proj", deps);
    const [status] = deps.ui.renderKitStatus.mock.calls[0];
    expect(status.updateAvailable).toBe(true);
    expect(status.latestKitVersion).toBe("0.2.0");
  });

  test("ui.renderKitStatus NOT called when ui is omitted (the command still returns the status)", async () => {
    // Defensive: a missing ui helper must not crash the
    // command. The result is still returned so the bin layer
    // can decide what to print.
    const deps = { engine: makeEngine({ status: HAPPY }) };
    const out = await runInfo("/tmp/proj", deps);
    expect(out).toEqual(HAPPY);
  });
});
