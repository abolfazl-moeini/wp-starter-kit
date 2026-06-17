/**
 * Tests for `packages/cli/src/commands/doctor.js` — Phase I5
 * `wpsk doctor` (I5.5, I5.6).
 *
 * Contract (per plan.installer.md §I5.5 + §I5.6):
 *   - `runDoctor(input, deps)` runs system-tool checks for:
 *       * `node --version`         (must be >= 18)
 *       * `composer --version`     (any, presence-only)
 *       * `php --version`          (must be >= 7.4)
 *       * `git --version`          (any, presence-only)
 *     Each check returns `{name, ok, found, version?}`.
 *   - The function calls `engine.doctorProject(dir)` and gets
 *     `{warnings, errors}`.
 *   - The combined report shape is
 *     `{ system: [...], project: {ok, warnings, errors} }`.
 *   - Pretty-printing is delegated to `ui.renderDoctor(report)`.
 *   - Exit code is encoded on the result:
 *       * `code: 0` when the report has zero errors
 *         (warnings allowed).
 *       * `code: 1` when the report has any errors.
 *       * `code: 2` when the report has ONLY warnings (no errors).
 *   - The function accepts both a string `dir` and an
 *     `{dir, runOptions: {json}}` object.
 *   - The function NEVER throws on engine errors.
 *
 * The system-tool checks are implemented inside `runDoctor`
 * with injectable probes (`deps.checkNodeVersion`, etc.) so
 * tests can simulate "node is 16" (fail) or "node is 20" (ok)
 * without spawning real subprocesses.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runDoctor } from "../../packages/cli/src/commands/doctor.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

/**
 * The system-tool probes are injected as a `checkXxx` namespace
 * on the deps. Each probe returns
 *   { name, ok, found: boolean, version?: string, reason?: string }
 *
 * A probe that can't find the tool returns `found:false`. The
 * doctor treats "node missing" as an error (Node is required),
 * "composer missing" as a warning (PHP-only projects are valid),
 * "php missing" as a warning (a JS-only project is valid), and
 * "git missing" as a warning (the project may not use VCS).
 */
function makeChecks({
  node = { name: "node", ok: true, found: true, version: "v20.0.0" },
  composer = { name: "composer", ok: true, found: true, version: "2.5.0" },
  php = { name: "php", ok: true, found: true, version: "8.1.0" },
  git = { name: "git", ok: true, found: true, version: "2.40.0" },
} = {}) {
  return {
    checkNodeVersion: jest.fn(async () => node),
    checkComposer: jest.fn(async () => composer),
    checkPhpVersion: jest.fn(async () => php),
    checkGit: jest.fn(async () => git),
  };
}

function makeEngine({ project = null } = {}) {
  const defaultProject =
    project !== null
      ? project
      : {
          ok: true,
          warnings: [],
          errors: [],
        };
  return {
    doctorProject: jest.fn(() => defaultProject),
  };
}

function makeUi() {
  return {
    log: jest.fn(async () => {}),
    renderSummary: jest.fn(async () => {}),
    // The new doctor renderer — tests assert it was called with
    // the combined report.
    renderDoctor: jest.fn(async (report) => {
      return { called: true, report };
    }),
  };
}

const baseDeps = (overrides = {}) => ({
  checks: makeChecks(),
  engine: makeEngine(),
  ui: makeUi(),
  ...overrides,
});

/* -------------------------------------------------------------------- */
/* I5.5 — system checks wiring                                            */
/* -------------------------------------------------------------------- */

describe("runDoctor — system checks (I5.5)", () => {
  test("calls each system probe (node, composer, php, git) with the injected checks object", async () => {
    const deps = baseDeps();
    await runDoctor("/tmp/proj", deps);
    expect(deps.checks.checkNodeVersion).toHaveBeenCalledTimes(1);
    expect(deps.checks.checkComposer).toHaveBeenCalledTimes(1);
    expect(deps.checks.checkPhpVersion).toHaveBeenCalledTimes(1);
    expect(deps.checks.checkGit).toHaveBeenCalledTimes(1);
  });

  test("the system array in the report contains one entry per probe, in canonical order", async () => {
    const deps = baseDeps();
    const out = await runDoctor("/tmp/proj", deps);
    const names = out.report.system.map((s) => s.name);
    expect(names).toEqual(["node", "composer", "php", "git"]);
  });

  test("node missing is reported as an error (a project cannot run without node)", async () => {
    const deps = baseDeps();
    deps.checks.checkNodeVersion = jest.fn(async () => ({
      name: "node",
      ok: false,
      found: false,
      reason: "node not found on PATH",
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.system[0].ok).toBe(false);
    expect(out.report.system[0].found).toBe(false);
  });

  test("node found but too old (<18) is reported as an error", async () => {
    const deps = baseDeps();
    deps.checks.checkNodeVersion = jest.fn(async () => ({
      name: "node",
      ok: false,
      found: true,
      version: "v16.20.0",
      reason: "node 16 is below the required 18",
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.system[0].ok).toBe(false);
    expect(out.report.system[0].version).toBe("v16.20.0");
  });

  test("composer missing is a warning, not an error (PHP-only projects are valid)", async () => {
    const deps = baseDeps();
    deps.checks.checkComposer = jest.fn(async () => ({
      name: "composer",
      ok: false,
      found: false,
      reason: "composer not found on PATH",
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.system[1].ok).toBe(false);
    expect(out.report.system[1].found).toBe(false);
  });

  test("php missing is a warning (a JS-only project is valid)", async () => {
    const deps = baseDeps();
    deps.checks.checkPhpVersion = jest.fn(async () => ({
      name: "php",
      ok: false,
      found: false,
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.system[2].ok).toBe(false);
    expect(out.report.system[2].found).toBe(false);
  });

  test("git missing is a warning (a project may not use VCS yet)", async () => {
    const deps = baseDeps();
    deps.checks.checkGit = jest.fn(async () => ({
      name: "git",
      ok: false,
      found: false,
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.system[3].ok).toBe(false);
    expect(out.report.system[3].found).toBe(false);
  });
});

/* -------------------------------------------------------------------- */
/* I5.5 — engine.doctorProject wiring                                      */
/* -------------------------------------------------------------------- */

describe("runDoctor — engine.doctorProject wiring (I5.5)", () => {
  test("calls engine.doctorProject with the resolved dir", async () => {
    const deps = baseDeps();
    await runDoctor("/tmp/proj", deps);
    expect(deps.engine.doctorProject).toHaveBeenCalledTimes(1);
    expect(deps.engine.doctorProject).toHaveBeenCalledWith("/tmp/proj");
  });

  test("forwards a string dir (bin-style call)", async () => {
    const deps = baseDeps();
    await runDoctor("/tmp/somewhere", deps);
    expect(deps.engine.doctorProject).toHaveBeenCalledWith("/tmp/somewhere");
  });

  test("forwards an object {dir, runOptions}", async () => {
    const deps = baseDeps();
    await runDoctor(
      { dir: "/tmp/elsewhere", runOptions: { json: true } },
      deps,
    );
    expect(deps.engine.doctorProject).toHaveBeenCalledWith("/tmp/elsewhere");
  });

  test("the project portion of the report is the engine's {ok, warnings, errors} verbatim", async () => {
    const deps = baseDeps();
    deps.engine.doctorProject = jest.fn(() => ({
      ok: false,
      warnings: ["manifest newer than installed deps — run wpdev update"],
      errors: ["unknown feature: foo"],
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.report.project.ok).toBe(false);
    expect(out.report.project.warnings).toEqual([
      "manifest newer than installed deps — run wpdev update",
    ]);
    expect(out.report.project.errors).toEqual(["unknown feature: foo"]);
  });

  test("catches a thrown engine.doctorProject and returns {ok:false, reason}", async () => {
    const deps = baseDeps();
    deps.engine.doctorProject = jest.fn(() => {
      throw new Error("EACCES: permission denied");
    });
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/EACCES/);
  });

  test("returns {ok:false, reason} when dir is missing", async () => {
    const deps = baseDeps();
    const out = await runDoctor(null, deps);
    expect(out.ok).toBe(false);
    expect(typeof out.reason).toBe("string");
  });
});

/* -------------------------------------------------------------------- */
/* I5.6 — exit code + ui.renderDoctor                                      */
/* -------------------------------------------------------------------- */

describe("runDoctor — exit codes (I5.6)", () => {
  test("code: 0 when there are no errors and no warnings", async () => {
    const deps = baseDeps();
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.code).toBe(0);
  });

  test("code: 1 when the report has at least one error", async () => {
    const deps = baseDeps();
    deps.engine.doctorProject = jest.fn(() => ({
      ok: false,
      warnings: [],
      errors: ["manifest missing"],
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.code).toBe(1);
  });

  test("code: 1 when a system check fails for a hard requirement (node missing)", async () => {
    const deps = baseDeps();
    deps.checks.checkNodeVersion = jest.fn(async () => ({
      name: "node",
      ok: false,
      found: false,
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.code).toBe(1);
  });

  test("code: 2 when the report has ONLY warnings (no errors)", async () => {
    const deps = baseDeps();
    deps.checks.checkComposer = jest.fn(async () => ({
      name: "composer",
      ok: false,
      found: false,
    }));
    deps.engine.doctorProject = jest.fn(() => ({
      ok: true,
      warnings: ["kit newer than installed deps — run wpdev update"],
      errors: [],
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.code).toBe(2);
  });

  test("when errors AND warnings are present, code is 1 (errors dominate)", async () => {
    const deps = baseDeps();
    deps.engine.doctorProject = jest.fn(() => ({
      ok: false,
      warnings: ["some warning"],
      errors: ["some error"],
    }));
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.code).toBe(1);
  });
});

describe("runDoctor — ui.renderDoctor wiring (I5.6)", () => {
  test("calls ui.renderDoctor with the combined report", async () => {
    const deps = baseDeps();
    await runDoctor("/tmp/proj", deps);
    expect(deps.ui.renderDoctor).toHaveBeenCalledTimes(1);
    const [report] = deps.ui.renderDoctor.mock.calls[0];
    expect(Array.isArray(report.system)).toBe(true);
    expect(report.system).toHaveLength(4);
    expect(typeof report.project).toBe("object");
  });

  test("a throwing ui.renderDoctor does NOT destroy the structured result (warning surfaced)", async () => {
    const deps = baseDeps();
    deps.ui.renderDoctor = jest.fn(async () => {
      throw new Error("TTY closed");
    });
    const out = await runDoctor("/tmp/proj", deps);
    expect(out.ok).toBe(true);
    expect(out.warning).toMatch(/TTY closed/);
    // Exit code still computed (render is just a print).
    expect(out.code).toBe(0);
  });

  test("--json flag flows into the result so the bin layer can choose JSON output", async () => {
    const deps = baseDeps();
    const out = await runDoctor(
      { dir: "/tmp/proj", runOptions: { json: true } },
      deps,
    );
    expect(out.json).toBe(true);
  });
});
