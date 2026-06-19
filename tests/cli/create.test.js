/**
 * Tests for `packages/cli/src/commands/create.js` — Phase I3
 * basic wiring (I3.1 + I3.2).
 *
 * Contract:
 *   - `runCreate({dir, answers, features}, deps)` calls
 *     `deps.engine.scaffoldProject(dir, answers, {features, force})`
 *     exactly once, with the right args.
 *   - The function returns `{ok:true, written}` on success.
 *   - The function returns `{ok:false, errors}` when the engine
 *     reports a failure (validation, scaffold, etc.).
 *   - The function NEVER throws on engine errors — engine
 *     failures are caught and surfaced as `{ok:false}` so the
 *     CLI can print a clean error and exit 1.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runCreate } from "../../packages/cli/src/commands/create.js";

/* -------------------------------------------------------------------- */
/* Test helpers                                                          */
/* -------------------------------------------------------------------- */

function makeEngine({ ok = true, written = [], reason = "" } = {}) {
  const calls = [];
  return {
    calls,
    scaffoldProject: jest.fn(async (...args) => {
      calls.push(args);
      if (ok) return { ok: true, written };
      return { ok: false, reason };
    }),
    // Manifest hooks — most tests don't assert on them, but the
    // test fixture provides them so the create command's
    // post-scaffold path doesn't warn.
    buildManifest: jest.fn((args) => ({
      schema: 1,
      kitVersion: args.kitVersion,
      distMode: "deps",
      generatedAt: "2026-06-15T00:00:00.000Z",
      features: { ...(args.features || {}) },
    })),
    writeManifest: jest.fn(async () => {}),
  };
}

function makeRunners() {
  const calls = { npmInstall: [], composerInstall: [], gitInit: [] };
  return {
    calls,
    npmInstall: jest.fn(async (dir) => {
      calls.npmInstall.push({ dir });
      return { ok: true };
    }),
    composerInstall: jest.fn(async (dir) => {
      calls.composerInstall.push({ dir });
      return { ok: true };
    }),
    gitInit: jest.fn(async (dir) => {
      calls.gitInit.push({ dir });
      return { ok: true };
    }),
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(() => []),
    log: jest.fn(async () => {}),
  };
}

function makeReadKitVersion(version = "0.1.0") {
  return jest.fn(() => version);
}

const defaultDeps = () => ({
  engine: makeEngine(),
  runners: makeRunners(),
  ui: makeUi(),
  readEnginePackageVersion: makeReadKitVersion(),
  fsAccess: jest.fn(async () => {
    /* file does not exist (default OK) */
    throw new Error("ENOENT");
  }),
});

/* -------------------------------------------------------------------- */
/* I3.1 — calls engine.scaffoldProject                                  */
/* -------------------------------------------------------------------- */

describe("runCreate — engine wiring (I3.1)", () => {
  test("calls engine.scaffoldProject exactly once with (dir, answers, {features, force})", async () => {
    const deps = defaultDeps();
    const out = await runCreate(
      {
        dir: "/tmp/wpdev",
        answers: { slug: "my-plugin", npmScope: "acme" },
        features: { js: "typescript", phpMinVersion: "8.1" },
        runOptions: { force: true },
      },
      deps,
    );
    expect(deps.engine.scaffoldProject).toHaveBeenCalledTimes(1);
    expect(deps.engine.scaffoldProject).toHaveBeenCalledWith(
      "/tmp/wpdev",
      { slug: "my-plugin", npmScope: "acme" },
      { features: { js: "typescript", phpMinVersion: "8.1" }, force: true },
    );
    expect(out.ok).toBe(true);
  });

  test("returns {ok:true, written, manifestPath, warnings} on success", async () => {
    const deps = defaultDeps();
    deps.engine.scaffoldProject = jest.fn(async () => ({
      ok: true,
      written: ["project.config.json"], // Phase 23: no src/Core/Plugin.php (deps)
    }));
    const out = await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features: {},
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(out.written).toEqual(["project.config.json"]); // no src/Core in deps mode (Phase 23)
    // manifestPath is the standard `<dir>/wpdev-kit.json` location.
    expect(out.manifestPath).toBe("/tmp/x/wpdev-kit.json");
    expect(out.warnings).toEqual([]);
  });

  test("forwards runOptions.force as options.force", async () => {
    const deps = defaultDeps();
    await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features: {},
        runOptions: { force: false },
      },
      deps,
    );
    const callArgs = deps.engine.scaffoldProject.mock.calls[0][2];
    expect(callArgs.force).toBe(false);
  });

  test("forwards runOptions.features as the engine.features arg", async () => {
    const deps = defaultDeps();
    const features = {
      js: "flow",
      jsLib: "react",
      phpMinVersion: "7.4",
      faultTolerance: "off",
    };
    await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features,
        runOptions: {},
      },
      deps,
    );
    const callArgs = deps.engine.scaffoldProject.mock.calls[0];
    expect(callArgs[0]).toBe("/tmp/x");
    // answers is forwarded with the sanitized slug and the
    // derived `uiFramework` (mapped from features.jsLib). The
    // engine requires uiFramework to be 'preact' or 'react',
    // so we always inject it.
    expect(callArgs[1]).toEqual({ slug: "x", uiFramework: "react" });
    expect(callArgs[2]).toEqual({ features, force: undefined });
  });

  test("derives answers.uiFramework from features.jsLib (preact default when none)", async () => {
    const deps = defaultDeps();
    const features = { js: "typescript", jsLib: "preact" };
    await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features,
        runOptions: {},
      },
      deps,
    );
    const answers = deps.engine.scaffoldProject.mock.calls[0][1];
    expect(answers.uiFramework).toBe("preact");
  });

  test("omits answers.uiFramework when jsLib is none (PHP-only project)", async () => {
    const deps = defaultDeps();
    const features = { js: "none", jsLib: "none" };
    await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features,
        runOptions: {},
      },
      deps,
    );
    const answers = deps.engine.scaffoldProject.mock.calls[0][1];
    expect(answers.uiFramework).toBeUndefined();
  });
});

/* -------------------------------------------------------------------- */
/* I3.2 — engine error path                                              */
/* -------------------------------------------------------------------- */

describe("runCreate — engine error path (I3.2)", () => {
  test("returns {ok:false, reason} when engine reports failure (does NOT throw)", async () => {
    const deps = defaultDeps();
    deps.engine.scaffoldProject = jest.fn(async () => ({
      ok: false,
      reason: "project.config.json already exists at /tmp/x",
    }));
    const out = await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features: {},
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/project.config.json already exists/);
  });

  test("catches a thrown engine error and returns {ok:false}", async () => {
    const deps = defaultDeps();
    deps.engine.scaffoldProject = jest.fn(async () => {
      throw new Error("disk full");
    });
    const out = await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features: {},
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/disk full/);
  });

  test("does NOT call any runner when the engine fails", async () => {
    const deps = defaultDeps();
    deps.engine.scaffoldProject = jest.fn(async () => ({
      ok: false,
      reason: "boom",
    }));
    await runCreate(
      {
        dir: "/tmp/x",
        answers: { slug: "x" },
        features: {},
        runOptions: { install: true, git: true },
      },
      deps,
    );
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
    expect(deps.runners.gitInit).not.toHaveBeenCalled();
  });
});
