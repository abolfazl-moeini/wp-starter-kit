/**
 * Tests for `packages/cli/src/commands/create.js` — post-gen
 * actions (I3.7 + I3.8).
 *
 * Contract:
 *   - `runOptions.install === true` triggers `runners.npmInstall`
 *     and `runners.composerInstall`, gated by the §I3.7 rules:
 *       npm:        only when `js ≠ 'none'` OR `husky === 'on'`
 *                   OR a `package.json` exists in the project.
 *       composer:   only when `phpTest === 'phpunit'` OR a
 *                   `composer.json` exists in the project.
 *   - `runOptions.git === true` triggers `runners.gitInit`.
 *   - With both false, no runner is called.
 *   - `runOptions.verbose` is forwarded to the runners.
 *   - A runner throwing OR returning `{ok:false}` is converted
 *     to a warning, NOT a hard error.
 */
import { describe, test, expect, jest } from "@jest/globals";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { runCreate } from "../../packages/cli/src/commands/create.js";

/* -------------------------------------------------------------------- */
/* Test helpers                                                          */
/* -------------------------------------------------------------------- */

function makeEngine({ ok = true } = {}) {
  return {
    scaffoldProject: jest.fn(async () => ({
      ok,
      written: ["project.config.json"],
    })),
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
  return {
    npmInstall: jest.fn(async () => ({ ok: true })),
    composerInstall: jest.fn(async () => ({ ok: true })),
    gitInit: jest.fn(async () => ({ ok: true })),
  };
}

function makeDeps(overrides = {}) {
  return {
    engine: makeEngine(),
    runners: makeRunners(),
    ui: {
      renderSummary: jest.fn(),
      renderNextSteps: jest.fn(() => []),
      log: jest.fn(),
    },
    readEnginePackageVersion: jest.fn(() => "0.1.0"),
    ...overrides,
  };
}

function makeEmptyDir() {
  return mkdtempSync(path.join(tmpdir(), "wpsk-i3-actions-"));
}

/* -------------------------------------------------------------------- */
/* I3.7 — install gating                                                */
/* -------------------------------------------------------------------- */

describe("runCreate — install + git gating (I3.7)", () => {
  test("with both runOptions.install + .git false, no runner is called", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpTest: "phpunit" },
          runOptions: {},
        },
        deps,
      );
      expect(deps.runners.npmInstall).not.toHaveBeenCalled();
      expect(deps.runners.composerInstall).not.toHaveBeenCalled();
      expect(deps.runners.gitInit).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.git:true → gitInit is called", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: { git: true },
        },
        deps,
      );
      expect(deps.runners.gitInit).toHaveBeenCalledTimes(1);
      expect(deps.runners.gitInit.mock.calls[0][0]).toBe(path.resolve(dir));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.install:true + js:typescript → npmInstall AND composerInstall (phpTest:phpunit) are called", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpTest: "phpunit" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
      expect(deps.runners.composerInstall).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.install:true + js:none + husky:off → npmInstall is SKIPPED (no package.json emitted)", async () => {
    // The §I3.7 rule: npm install is skipped when both
    //   - js === 'none', AND
    //   - husky === 'off'
    // (because the engine does not emit a package.json). The
    // composer call still happens if phpTest:phpunit.
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "none", husky: "off", phpTest: "phpunit" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(deps.runners.npmInstall).not.toHaveBeenCalled();
      expect(deps.runners.composerInstall).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.install:true + js:none + husky:on → npmInstall IS called (package.json for husky)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "none", husky: "on", phpTest: "phpunit" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.install:true + phpTest:none → composerInstall is SKIPPED (no composer.json emitted)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpTest: "none" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(deps.runners.composerInstall).not.toHaveBeenCalled();
      // npm still runs because js:typescript.
      expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.install:true + package.json exists on disk → npmInstall IS called even if js:none + husky:off", async () => {
    // Defensive: if a stale package.json is in the target dir,
    // we still run npm install. The post-gen check is "is
    // there a package.json?" — feature-set gating is the
    // primary, but disk check is the fallback.
    const dir = makeEmptyDir();
    writeFileSync(path.join(dir, "package.json"), "{}\n");
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "none", husky: "off" },
          runOptions: { install: true, force: true },
        },
        deps,
      );
      expect(deps.runners.npmInstall).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* I3.8 — verbose forwarded; runner failure → warning                   */
/* -------------------------------------------------------------------- */

describe("runCreate — verbose forwarded; runner failure is a warning (I3.8)", () => {
  test("runOptions.verbose is forwarded to npmInstall", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpTest: "phpunit" },
          runOptions: { install: true, verbose: true },
        },
        deps,
      );
      const npmArgs = deps.runners.npmInstall.mock.calls[0];
      expect(npmArgs[0]).toBe(path.resolve(dir));
      expect(npmArgs[1]).toEqual({ verbose: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.verbose is forwarded to gitInit", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: { git: true, verbose: true },
        },
        deps,
      );
      const gitArgs = deps.runners.gitInit.mock.calls[0];
      expect(gitArgs[1]).toEqual({ verbose: true });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("default verbose:false is forwarded to runners", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(deps.runners.npmInstall.mock.calls[0][1]).toEqual({
        verbose: false,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a runner returning {ok:false, error} is a warning, NOT a hard error", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.runners.npmInstall = jest.fn(async () => ({
        ok: false,
        error: "EACCES",
      }));
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(out.warnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/EACCES/)]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a runner returning {ok:false, skipped:true} is a warning, NOT a hard error", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.runners.composerInstall = jest.fn(async () => ({
        ok: false,
        skipped: true,
        reason: "composer not found on PATH",
      }));
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpTest: "phpunit" },
          runOptions: { install: true },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(out.warnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/composer/)]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a runner THROWING is caught and turned into a warning", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.runners.gitInit = jest.fn(async () => {
        throw new Error("git exploded");
      });
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: { git: true },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(out.warnings).toEqual(
        expect.arrayContaining([expect.stringMatching(/git exploded/)]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
