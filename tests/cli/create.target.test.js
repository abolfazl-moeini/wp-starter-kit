/**
 * Tests for `packages/cli/src/commands/create.js` — target dir
 * rules (I3.3 + I3.4).
 *
 * Contract:
 *   - Empty / non-existent target dir → OK.
 *   - Existing non-empty dir without --force → refuse with a
 *     clear error.
 *   - Existing non-empty dir with --force → proceed.
 *   - The slug is sanitized to a valid kebab-case string.
 *   - Dir resolution is independent of slug: --dir= controls the
 *     output location, --slug= controls the plugin slug.
 */
import { describe, test, expect, jest } from "@jest/globals";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

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

/**
 * Build a fresh empty dir under the OS tmp root. The path is
 * returned so the test can populate or remove it as needed.
 */
function makeEmptyDir(prefix = "wpsk-i3-") {
  return mkdtempSync(path.join(tmpdir(), prefix));
}

/* -------------------------------------------------------------------- */
/* I3.3 — empty / new dir is OK                                         */
/* -------------------------------------------------------------------- */

describe("runCreate — target dir: empty / new", () => {
  test("non-existent dir is OK (engine is called)", async () => {
    const dir = path.join(tmpdir(), "wpsk-i3-nonexistent-" + Date.now());
    const deps = makeDeps();
    const out = await runCreate(
      {
        dir,
        answers: { slug: "my-plugin" },
        features: {},
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(true);
    expect(deps.engine.scaffoldProject).toHaveBeenCalledTimes(1);
    expect(deps.engine.scaffoldProject.mock.calls[0][0]).toBe(
      path.resolve(dir),
    );
  });

  test("fresh empty dir is OK (engine is called)", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "my-plugin" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(deps.engine.scaffoldProject).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* I3.3 — non-empty dir without --force refuses                         */
/* -------------------------------------------------------------------- */

describe("runCreate — target dir: non-empty without --force", () => {
  test("existing dir with files refuses BEFORE calling the engine", async () => {
    const dir = makeEmptyDir();
    writeFileSync(path.join(dir, "README.md"), "# leftover\n");
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "my-plugin" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(false);
      expect(out.reason).toMatch(/not empty/);
      expect(out.reason).toMatch(/--force/);
      // Crucially: the engine is never called when the dir guard
      // refuses. This is the "fail fast" guarantee.
      expect(deps.engine.scaffoldProject).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an existing file (not a dir) at the path also refuses", async () => {
    const dir = makeEmptyDir();
    const file = path.join(dir, "blocker");
    writeFileSync(file, "x");
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir: file, // path resolves to a regular file
          answers: { slug: "my-plugin" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(false);
      expect(out.reason).toMatch(/not empty/);
      expect(deps.engine.scaffoldProject).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* I3.3 — non-empty dir with --force proceeds                            */
/* -------------------------------------------------------------------- */

describe("runCreate — target dir: non-empty WITH --force", () => {
  test("non-empty dir + --force proceeds and engine is called", async () => {
    const dir = makeEmptyDir();
    writeFileSync(path.join(dir, "README.md"), "# leftover\n");
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "my-plugin" },
          features: {},
          runOptions: { force: true },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(deps.engine.scaffoldProject).toHaveBeenCalledTimes(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* I3.4 — slug sanitization                                              */
/* -------------------------------------------------------------------- */

describe("runCreate — slug sanitization", () => {
  test("'My Plugin!' is sanitized to 'my-plugin'", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "My Plugin!" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(true);
      // Slug flows into answers. Even though we pass the raw
      // answers through, the engine should receive the
      // sanitized slug.
      const callAnswers = deps.engine.scaffoldProject.mock.calls[0][1];
      expect(callAnswers.slug).toBe("my-plugin");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("'foo_bar baz' is sanitized to 'foo-bar-baz'", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "foo_bar baz" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(true);
      const callAnswers = deps.engine.scaffoldProject.mock.calls[0][1];
      expect(callAnswers.slug).toBe("foo-bar-baz");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("an all-punctuation slug is rejected with a clear error", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "!!!" },
          features: {},
          runOptions: {},
        },
        deps,
      );
      expect(out.ok).toBe(false);
      expect(out.reason).toMatch(/slug/i);
      expect(deps.engine.scaffoldProject).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("--slug= overrides answers.slug", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir,
          answers: { slug: "original" },
          features: {},
          runOptions: { slug: "override-slug" },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      const callAnswers = deps.engine.scaffoldProject.mock.calls[0][1];
      expect(callAnswers.slug).toBe("override-slug");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/* -------------------------------------------------------------------- */
/* dir resolution from runOptions.targetDir                             */
/* -------------------------------------------------------------------- */

describe("runCreate — dir resolution from runOptions.targetDir", () => {
  test("runOptions.targetDir is used as the output dir when set", async () => {
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const out = await runCreate(
        {
          dir: undefined, // no top-level dir
          answers: { slug: "x" },
          features: {},
          runOptions: { targetDir: dir },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      expect(deps.engine.scaffoldProject.mock.calls[0][0]).toBe(
        path.resolve(dir),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("missing dir with no runOptions.targetDir is a hard error", async () => {
    const deps = makeDeps();
    const out = await runCreate(
      {
        answers: { slug: "x" },
        features: {},
        runOptions: {},
      },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/dir is required/);
  });
});
