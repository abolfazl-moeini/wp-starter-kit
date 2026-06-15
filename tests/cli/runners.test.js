/**
 * Tests for `packages/cli/src/runners.js` — the execa wrappers for
 * `npm install`, `composer install`, `git init`.
 *
 * Contract (plan.installer.md §I6 + task instructions):
 *   1. Each runner returns a result object — it never throws.
 *   2. Missing tool on PATH → `{ ok: false, skipped: true, reason }`.
 *   3. Non-zero exit → `{ ok: false, error: msg }` (NOT skipped).
 *   4. Success → `{ ok: true }`.
 *   5. `verbose: true` → stdio piped to the parent process.
 *   6. `verbose: false` (default) → stdio suppressed.
 *
 * The runners accept a `deps` argument (injection seam) so the
 * tests can mock `execa` and `commandExists` (or whichever
 * presence-check helper) without touching the real filesystem or
 * PATH.
 */
import { describe, test, expect, jest } from "@jest/globals";

import {
  npmInstall,
  composerInstall,
  gitInit,
  commandExists,
} from "../../packages/cli/src/runners.js";

/* -------------------------------------------------------------------- */
/* Test helpers                                                          */
/* -------------------------------------------------------------------- */

/**
 * Build a minimal `deps` object that satisfies the runner contract.
 * Tests override only the methods they exercise.
 */
function makeDeps(overrides = {}) {
  return {
    commandExists,
    execa: (cmd, args, opts) => {
      // Default mock — not used by most tests (they override
      // `deps.execa` explicitly). Provided so a stray test that
      // forgets to mock execa still surfaces a clear failure
      // rather than firing a real subprocess.
      throw new Error(`execa called unexpectedly: ${cmd} ${args.join(" ")}`);
    },
    spawnSync: (tool, args) => {
      // Default mock — 'which' check returns 0 for everything.
      // Individual tests override commandExists directly so the
      // real spawnSync is never invoked.
      return { status: 0 };
    },
    ...overrides,
  };
}

/* -------------------------------------------------------------------- */
/* commandExists — the tool presence check                              */
/* -------------------------------------------------------------------- */

describe("commandExists()", () => {
  test("returns true when the command is on PATH (uses real spawnSync)", async () => {
    // 'node' is always on PATH in the jest environment. This test
    // exercises the default branch (no deps override) so we can
    // catch a regression in the spawnSync wiring.
    const ok = await commandExists("node");
    expect(ok).toBe(true);
  });

  test("returns false for a non-existent tool (uses real spawnSync)", async () => {
    const ok = await commandExists("definitely-not-a-real-binary-12345");
    expect(ok).toBe(false);
  });

  test("spawnSync throwing → false (defensive)", async () => {
    const ok = await commandExists("x", {
      spawnSync: () => {
        throw new Error("EPERM");
      },
    });
    expect(ok).toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* npmInstall                                                            */
/* -------------------------------------------------------------------- */

describe("npmInstall(dir, {verbose}, deps)", () => {
  test("returns {ok:false, skipped:true, reason} when npm is not on PATH", async () => {
    const deps = makeDeps({
      commandExists: async () => false,
    });
    const r = await npmInstall("/tmp/x", { verbose: false }, deps);
    expect(r).toEqual({
      ok: false,
      skipped: true,
      reason: expect.stringMatching(/npm/),
    });
  });

  test("returns {ok:true} on a zero exit (no throw)", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({ exitCode: 0 })),
    });
    const r = await npmInstall("/tmp/x", { verbose: false }, deps);
    expect(r).toEqual({ ok: true });
  });

  test("returns {ok:false, error} on a non-zero exit (not skipped)", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({
        exitCode: 1,
        shortMessage: "EACCES something",
      })),
    });
    const r = await npmInstall("/tmp/x", { verbose: false }, deps);
    expect(r.ok).toBe(false);
    expect(r.skipped).toBeFalsy();
    expect(r.error).toMatch(/EACCES/);
  });

  test("does not throw even when execa itself throws", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => {
        throw new Error("boom");
      }),
    });
    const r = await npmInstall("/tmp/x", {}, deps);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/boom/);
  });

  test("verbose:true passes stdio:'inherit' to execa", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await npmInstall("/tmp/x", { verbose: true }, deps);
    expect(execa).toHaveBeenCalledTimes(1);
    const opts = execa.mock.calls[0][2];
    expect(opts.stdio).toBe("inherit");
  });

  test("verbose:false (default) suppresses stdio (stdio:'pipe')", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await npmInstall("/tmp/x", {}, deps);
    const opts = execa.mock.calls[0][2];
    expect(opts.stdio).not.toBe("inherit");
  });

  test("calls execa with 'npm' and ['install'] (not 'install --prefix' or 'ci')", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await npmInstall("/tmp/proj", { verbose: false }, deps);
    expect(execa).toHaveBeenCalledWith(
      "npm",
      ["install"],
      expect.objectContaining({ cwd: "/tmp/proj" }),
    );
  });
});

/* -------------------------------------------------------------------- */
/* composerInstall                                                       */
/* -------------------------------------------------------------------- */

describe("composerInstall(dir, {verbose}, deps)", () => {
  test("returns {ok:false, skipped:true} when composer is not on PATH", async () => {
    const deps = makeDeps({
      commandExists: async (cmd) => cmd !== "composer",
    });
    const r = await composerInstall("/tmp/x", {}, deps);
    expect(r).toEqual({
      ok: false,
      skipped: true,
      reason: expect.stringMatching(/composer/),
    });
  });

  test("returns {ok:true} on a zero exit", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({ exitCode: 0 })),
    });
    const r = await composerInstall("/tmp/x", {}, deps);
    expect(r).toEqual({ ok: true });
  });

  test("returns {ok:false, error} on non-zero exit (not skipped)", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({
        exitCode: 2,
        shortMessage: "Plugin not found",
      })),
    });
    const r = await composerInstall("/tmp/x", {}, deps);
    expect(r.ok).toBe(false);
    expect(r.skipped).toBeFalsy();
    expect(r.error).toMatch(/Plugin not found/);
  });

  test("verbose:true passes stdio:'inherit'", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await composerInstall("/tmp/x", { verbose: true }, deps);
    expect(execa.mock.calls[0][2].stdio).toBe("inherit");
  });

  test("calls execa with 'composer' and ['install']", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await composerInstall("/tmp/proj", {}, deps);
    expect(execa).toHaveBeenCalledWith(
      "composer",
      ["install"],
      expect.objectContaining({ cwd: "/tmp/proj" }),
    );
  });
});

/* -------------------------------------------------------------------- */
/* gitInit                                                               */
/* -------------------------------------------------------------------- */

describe("gitInit(dir, {verbose}, deps)", () => {
  test("returns {ok:false, skipped:true} when git is not on PATH", async () => {
    const deps = makeDeps({
      commandExists: async (cmd) => cmd !== "git",
    });
    const r = await gitInit("/tmp/x", {}, deps);
    expect(r).toEqual({
      ok: false,
      skipped: true,
      reason: expect.stringMatching(/git/),
    });
  });

  test("returns {ok:true} on a zero exit", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({ exitCode: 0 })),
    });
    const r = await gitInit("/tmp/x", {}, deps);
    expect(r).toEqual({ ok: true });
  });

  test("returns {ok:false, error} on non-zero exit (not skipped)", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => ({
        exitCode: 128,
        shortMessage: "fatal: not a git repository",
      })),
    });
    const r = await gitInit("/tmp/x", {}, deps);
    expect(r.ok).toBe(false);
    expect(r.skipped).toBeFalsy();
    expect(r.error).toMatch(/fatal/);
  });

  test("verbose:true passes stdio:'inherit'", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await gitInit("/tmp/x", { verbose: true }, deps);
    expect(execa.mock.calls[0][2].stdio).toBe("inherit");
  });

  test("calls execa with 'git' and ['init']", async () => {
    const execa = jest.fn(async () => ({ exitCode: 0 }));
    const deps = makeDeps({
      commandExists: async () => true,
      execa,
    });
    await gitInit("/tmp/proj", {}, deps);
    expect(execa).toHaveBeenCalledWith(
      "git",
      ["init"],
      expect.objectContaining({ cwd: "/tmp/proj" }),
    );
  });

  test("never throws when execa itself rejects", async () => {
    const deps = makeDeps({
      commandExists: async () => true,
      execa: jest.fn(async () => {
        throw new Error("spawn ENOENT");
      }),
    });
    const r = await gitInit("/tmp/x", {}, deps);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/ENOENT/);
  });
});

/* -------------------------------------------------------------------- */
/* default dependency wiring (when deps arg is omitted)                  */
/* -------------------------------------------------------------------- */
//
// Note: We do NOT exercise the no-deps code path in unit tests
// because execa is ESM and the jest environment cannot load it
// without complex transformIgnorePatterns. The runner contract
// is covered by the per-runner tests above (which all use the
// `deps` injection seam). The real-deps path is validated by
// the manual smoke test in `deliverable.md` (the CLI actually
// runs in a real Node environment where execa loads fine).
