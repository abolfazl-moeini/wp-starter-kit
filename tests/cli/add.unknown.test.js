/**
 * Tests for `packages/cli/src/commands/add.js` — unknown feature
 * id path (Phase I4.5 / I4.6). Split out into its own file per
 * plan.installer.md §I4.5.
 *
 * Contract:
 *   - Validates the feature id against `engine.getFeatureCatalog()`
 *     BEFORE calling the engine.
 *   - An unknown id → returns `{ok:false, reason}` that lists the
 *     valid ids so the user can fix the typo.
 *   - The engine (`engine.addFeature`) is NOT called.
 *   - No runner is called (the run exits before any I/O).
 *   - The function NEVER throws on an unknown id.
 *
 * The behavioural tests (engine wiring, install gating, error
 * surfacing) live in `tests/cli/add.test.js`. This file is the
 * single-source-of-truth for the validator, so a future reviewer
 * who breaks the unknown-id path sees a targeted failure.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runAdd } from "../../packages/cli/src/commands/add.js";

const CATALOG = [
  {
    id: "js",
    variants: ["typescript", "pure", "flow", "none"],
    default: "typescript",
  },
  { id: "jsLib", variants: ["none", "preact", "react"], default: "none" },
  { id: "husky", variants: ["on", "off"], default: "on" },
  {
    id: "css",
    variants: ["none", "sass", "tailwind", "postcss"],
    default: "none",
  },
  { id: "i18n", variants: ["on", "off"], default: "on" },
];

function makeEngine() {
  return {
    getFeatureCatalog: jest.fn(() => CATALOG),
    addFeature: jest.fn(async () => {
      throw new Error(
        "engine.addFeature called for an unknown id — the validator should have caught this",
      );
    }),
  };
}

const baseDeps = () => ({
  engine: makeEngine(),
  runners: {
    npmInstall: jest.fn(async () => ({ ok: true })),
    composerInstall: jest.fn(async () => ({ ok: true })),
    gitInit: jest.fn(async () => ({ ok: true })),
  },
  ui: {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(() => []),
    log: jest.fn(async () => {}),
    confirm: jest.fn(async () => true),
  },
});

describe("runAdd — unknown feature id (I4.5, I4.6)", () => {
  test("returns {ok:false, reason} that lists the valid ids", async () => {
    const deps = baseDeps();
    const out = await runAdd(
      { dir: "/tmp/proj", featureId: "not-a-real-feature", runOptions: {} },
      deps,
    );
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/unknown feature/i);
  });

  test("the reason lists every valid id from the catalog", async () => {
    const deps = baseDeps();
    const out = await runAdd(
      { dir: "/tmp/proj", featureId: "not-a-real-feature", runOptions: {} },
      deps,
    );
    for (const f of CATALOG) {
      expect(out.reason).toMatch(f.id);
    }
  });

  test("engine.addFeature is NOT called for an unknown id", async () => {
    const deps = baseDeps();
    await runAdd(
      { dir: "/tmp/proj", featureId: "not-a-real-feature", runOptions: {} },
      deps,
    );
    expect(deps.engine.addFeature).not.toHaveBeenCalled();
  });

  test("no runner is called for an unknown id", async () => {
    const deps = baseDeps();
    await runAdd(
      {
        dir: "/tmp/proj",
        featureId: "not-a-real-feature",
        runOptions: { install: true },
      },
      deps,
    );
    expect(deps.runners.npmInstall).not.toHaveBeenCalled();
    expect(deps.runners.composerInstall).not.toHaveBeenCalled();
  });

  test("the function does NOT throw for an unknown id", async () => {
    const deps = baseDeps();
    await expect(
      runAdd(
        { dir: "/tmp/proj", featureId: "not-a-real-feature", runOptions: {} },
        deps,
      ),
    ).resolves.toBeDefined();
  });
});
