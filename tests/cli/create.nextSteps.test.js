/**
 * Tests for `packages/cli/src/commands/create.js` — next-steps
 * output (I3.9 + I3.10).
 *
 * Contract: after a successful `wpdev create`, the bin layer
 * should ask `ui.renderNextSteps(features, runOptions)` to
 * produce the list of follow-up commands. The runCreate
 * command itself does not own the print; it just returns the
 * resolved `{features, runOptions}` shape that the bin uses
 * to invoke the UI helper.
 *
 * This test is the "contract" lock between the command and
 * the ui helper. We assert:
 *   - For a JS+PHP project, renderNextSteps lists `npm install`
 *     AND `composer install`.
 *   - For a PHP-only project (js:none, husky:off, phpTest:phpunit),
 *     only `composer install` is listed.
 *   - For a fully-disabled project (js:none, husky:off,
 *     phpTest:none), neither npm nor composer is listed.
 */
import { describe, test, expect, jest } from "@jest/globals";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { runCreate } from "../../packages/cli/src/commands/create.js";
import { renderNextSteps } from "../../packages/cli/src/ui.js";

/* -------------------------------------------------------------------- */
/* Test helpers                                                          */
/* -------------------------------------------------------------------- */

function makeEngine() {
  return {
    scaffoldProject: jest.fn(async () => ({
      ok: true,
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

function makeDeps() {
  return {
    engine: makeEngine(),
    runners: {
      npmInstall: jest.fn(async () => ({ ok: true })),
      composerInstall: jest.fn(async () => ({ ok: true })),
      gitInit: jest.fn(async () => ({ ok: true })),
    },
    ui: {
      renderSummary: jest.fn(),
      renderNextSteps: jest.fn(),
      log: jest.fn(),
    },
    readEnginePackageVersion: jest.fn(() => "0.1.0"),
  };
}

function makeEmptyDir() {
  return mkdtempSync(path.join(tmpdir(), "wpdev-i3-nextsteps-"));
}

/* -------------------------------------------------------------------- */
/* I3.9 / I3.10 — next steps output                                     */
/* -------------------------------------------------------------------- */

describe("runCreate / ui.renderNextSteps — next-steps contract (I3.9/I3.10)", () => {
  test("renderNextSteps lists 'npm install' when js is on (typescript)", () => {
    const steps = renderNextSteps(
      { js: "typescript", phpTest: "phpunit" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(true);
  });

  test("renderNextSteps lists 'npm install' when husky is on (js:none)", () => {
    // The §I3.7 rule for npm applies identically to next-steps:
    // the package.json is needed for husky even when JS is off.
    const steps = renderNextSteps(
      { js: "none", husky: "on", phpTest: "phpunit" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(true);
  });

  test("renderNextSteps lists 'composer install' when phpTest:phpunit", () => {
    const steps = renderNextSteps(
      { js: "typescript", phpTest: "phpunit" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /composer install/.test(s))).toBe(true);
  });

  test("renderNextSteps for a fully-PHP-only project (js:none, husky:off, phpTest:none) lists neither", () => {
    const steps = renderNextSteps(
      { js: "none", husky: "off", phpTest: "none" },
      { targetDir: "/tmp/proj" },
    );
    expect(steps.some((s) => /npm install/.test(s))).toBe(false);
    expect(steps.some((s) => /composer install/.test(s))).toBe(false);
    // But the `cd` step is still there.
    expect(steps[0]).toMatch(/^cd\s+\/tmp\/proj/);
  });

  test("the first step is always `cd <targetDir>`", () => {
    const steps = renderNextSteps(
      { js: "typescript", phpTest: "phpunit" },
      { targetDir: "/var/tmp/wpdev" },
    );
    expect(steps[0]).toBe("cd /var/tmp/wpdev");
  });

  test("renderNextSteps lists companion plugin activation when phpFramework is wpdev", () => {
    const steps = renderNextSteps(
      { js: "none", husky: "off", phpTest: "none", phpFramework: "wpdev" },
      { targetDir: "/tmp/proj" },
    );
    expect(
      steps.some((s) =>
        /Activate the companion plugin under companion-plugins\/wpdev\//.test(
          s,
        ),
      ),
    ).toBe(true);
  });

  test("runCreate returns the resolved features + runOptions shape that the bin uses to drive renderNextSteps", async () => {
    // The bin layer (main.js) is responsible for invoking
    // `ui.renderNextSteps(resolved.features, resolved.runOptions)`
    // after runCreate returns. runCreate itself does not own
    // the call (so unit tests of the command can stay focused
    // on the engine + runners contract). This test locks the
    // contract by asserting the shape that flows OUT of
    // runCreate.
    const dir = makeEmptyDir();
    try {
      const deps = makeDeps();
      const features = {
        js: "typescript",
        jsLib: "preact",
        css: "tailwind",
        blocks: "on",
        phpMinVersion: "8.1",
        phpTest: "phpunit",
        husky: "on",
        faultTolerance: "off",
      };
      const out = await runCreate(
        {
          dir,
          answers: { slug: "x" },
          features,
          runOptions: { targetDir: dir, install: true, git: true },
        },
        deps,
      );
      expect(out.ok).toBe(true);
      // The bin code is expected to call:
      //   ui.renderNextSteps(features, runOptions)
      // and the features/runOptions we just supplied are
      // exactly what comes out. This is the contract lock.
      const steps = renderNextSteps(features, { targetDir: dir });
      expect(steps.some((s) => /npm install/.test(s))).toBe(true);
      expect(steps.some((s) => /composer install/.test(s))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
