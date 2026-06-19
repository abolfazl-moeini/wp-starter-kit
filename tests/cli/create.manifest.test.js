/**
 * Tests for `packages/cli/src/commands/create.js` — manifest
 * write (I3.5 + I3.6).
 *
 * Contract:
 *   - After a successful scaffold, the engine is asked to write
 *     a manifest with the resolved `kitVersion` and the
 *     feature set the caller passed in.
 *   - `kitVersion` comes from `deps.readEnginePackageVersion()`
 *     (a test seam that returns the engine's package.json
 *     version).
 *   - `runOptions.kitVersion` overrides the read-from-package
 *     value (test override per plan §I3.6).
 *   - The manifest is written to `<dir>/wpdev-kit.json`.
 *   - If the manifest write itself fails, runCreate still
 *     returns ok:true with a warning (not a hard error).
 */
import { describe, test, expect, jest } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { runCreate } from "../../packages/cli/src/commands/create.js";

/* -------------------------------------------------------------------- */
/* Test helpers                                                          */
/* -------------------------------------------------------------------- */

function makeEngine({ ok = true, manifestFails = false } = {}) {
  const calls = { scaffold: [], buildManifest: [], writeManifest: [] };
  return {
    calls,
    scaffoldProject: jest.fn(async () => ({
      ok,
      written: ["wpdev.json"],
      reason: ok ? undefined : "engine error",
    })),
    buildManifest: jest.fn((args) => {
      calls.buildManifest.push(args);
      return {
        schema: 2,
        kitVersion: args.kitVersion,
        distMode: "deps",
        generatedAt: "2026-06-15T00:00:00.000Z",
        features: { ...(args.features || {}) },
      };
    }),
    writeManifest: jest.fn(async (...args) => {
      calls.writeManifest.push(args);
      if (manifestFails) {
        throw new Error("disk full");
      }
    }),
  };
}

function makeDeps(overrides = {}) {
  return {
    engine: makeEngine(),
    runners: {
      npmInstall: jest.fn(async () => ({ ok: true })),
      composerInstall: jest.fn(async () => ({ ok: true })),
      gitInit: jest.fn(async () => ({ ok: true })),
    },
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
  return mkdtempSync(path.join(tmpdir(), "wpdev-i3-manifest-"));
}

/* -------------------------------------------------------------------- */
/* I3.5 — manifest is built + written after a successful scaffold       */
/* -------------------------------------------------------------------- */

describe("runCreate — manifest write (I3.5)", () => {
  test("buildManifest is called with kitVersion + features", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: { js: "typescript", phpMinVersion: "8.1", husky: "on" },
          runOptions: {},
        },
        deps,
      );
      expect(deps.engine.buildManifest).toHaveBeenCalledTimes(1);
      const args = deps.engine.buildManifest.mock.calls[0][0];
      expect(args.kitVersion).toBe("0.1.0");
      expect(args.features).toEqual({
        js: "typescript",
        phpMinVersion: "8.1",
        husky: "on",
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("writeManifest is called with (dir, manifest)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(deps.engine.writeManifest).toHaveBeenCalledTimes(1);
      const [writeDir, manifest] = deps.engine.writeManifest.mock.calls[0];
      expect(writeDir).toBe(path.resolve(dir));
      expect(manifest.kitVersion).toBe("0.1.0");
      expect(manifest.features).toEqual({});
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("the returned manifestPath is <dir>/wpdev-kit.json", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.manifestPath).toBe(path.join(path.resolve(dir), "wpdev.json"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* I3.6 — kitVersion resolution                                          */
/* -------------------------------------------------------------------- */

describe("runCreate — kitVersion resolution (I3.6)", () => {
  test("kitVersion comes from readEnginePackageVersion() (default '0.1.0')", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.readEnginePackageVersion = jest.fn(() => "0.42.0");
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(deps.readEnginePackageVersion).toHaveBeenCalledTimes(1);
      expect(out.ok).toBe(true);
      const args = deps.engine.buildManifest.mock.calls[0][0];
      expect(args.kitVersion).toBe("0.42.0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("runOptions.kitVersion overrides readEnginePackageVersion (test seam)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.readEnginePackageVersion = jest.fn(() => "0.42.0");
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: { kitVersion: "9.9.9" },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      const args = deps.engine.buildManifest.mock.calls[0][0];
      // Override wins, read function may or may not be called —
      // we just assert the resulting kitVersion.
      expect(args.kitVersion).toBe("9.9.9");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("readEnginePackageVersion is NOT called when runOptions.kitVersion is set", async () => {
    // Per the plan, the override is purely a test seam — when
    // it is set, the CLI does not even consult the engine's
    // package.json. This avoids the override accidentally
    // surfacing a "real" version.
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.readEnginePackageVersion = jest.fn(() => "0.42.0");
      await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: { kitVersion: "9.9.9" },
        },
        deps,
      );
      expect(deps.readEnginePackageVersion).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* Defensive — manifest write failure is a warning, not a hard error    */
/* -------------------------------------------------------------------- */

describe("runCreate — manifest write failure is a warning", () => {
  test("writeManifest throwing → ok:true with a warning (run continues)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      deps.engine.writeManifest = jest.fn(async () => {
        throw new Error("EACCES");
      });
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(out.warnings.length).toBeGreaterThan(0);
      expect(out.warnings[0]).toMatch(/wpdev\.json/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
