/**
 * Tests for `packages/cli/src/commands/list.js` — Phase I4
 * `wpdev list` (I4.1, I4.2).
 *
 * Contract (per plan.installer.md §I4.1 + I4.2):
 *   - `runList(dir, {engine, ui})` reads the manifest via
 *     `engine.readManifest(dir)`.
 *   - Returns rows `[{id, state, variant}, ...]` — ONE row per
 *     feature in the engine catalog (`engine.getFeatureCatalog()`).
 *   - `state` is "on" when the manifest records the feature with a
 *     non-OFF variant (e.g. "typescript", "phpunit", "on"), and
 *     "off" when the manifest records the OFF value (e.g. "none",
 *     "off") or when the feature is absent from the manifest
 *     (treat absent as the catalog default's OFF-state).
 *   - `variant` is the raw value from the manifest (or the
 *     default variant when the manifest is silent on the feature).
 *   - When the manifest is missing (engine.readManifest returns
 *     null), the function returns `{ok:false, reason}` and does
 *     NOT print anything via ui.
 *   - The function NEVER throws on engine errors. A missing
 *     manifest is the canonical error case; a throwing
 *     `engine.readManifest` is caught and surfaced as
 *     `{ok:false, reason}`.
 */
import { describe, test, expect, jest } from "@jest/globals";

import { runList } from "../../packages/cli/src/commands/list.js";

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
  { id: "i18n", variants: ["on", "off"], default: "on" },
];

function makeEngine({ manifest = null, catalog = CATALOG } = {}) {
  return {
    getFeatureCatalog: jest.fn(() => catalog),
    readManifest: jest.fn(() => manifest),
  };
}

function makeUi() {
  return {
    renderSummary: jest.fn(async () => {}),
    renderNextSteps: jest.fn(() => []),
    log: jest.fn(async () => {}),
    // Phase I4 introduces a new `ui.renderFeatureTable(rows)` that
    // pretty-prints the rows. The list command delegates the
    // table rendering to it; tests assert it was called with the
    // right shape.
    renderFeatureTable: jest.fn(async (rows) => {
      // The fake returns the rows as-is so tests can still
      // assert structural properties (the contract is the call
      // shape, not the formatting).
      return rows;
    }),
  };
}

const baseDeps = () => ({
  engine: makeEngine(),
  ui: makeUi(),
});

/* -------------------------------------------------------------------- */
/* I4.1 — runs engine.readManifest and returns one row per catalog entry */
/* -------------------------------------------------------------------- */

describe("runList — manifest wiring (I4.1)", () => {
  test("returns one row per catalog feature (manifest supplies variants)", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      manifest: {
        schema: 1,
        kitVersion: "0.1.0",
        features: {
          js: "typescript",
          jsLib: "none",
          husky: "on",
          faultTolerance: "off",
          i18n: "on",
        },
      },
    });
    const out = await runList("/tmp/proj", deps);
    expect(out.ok).toBe(true);
    expect(out.rows).toHaveLength(CATALOG.length);
    const byId = Object.fromEntries(out.rows.map((r) => [r.id, r]));
    expect(byId.js.variant).toBe("typescript");
    expect(byId.js.state).toBe("on");
    expect(byId.husky.variant).toBe("on");
    expect(byId.husky.state).toBe("on");
    expect(byId.faultTolerance.variant).toBe("off");
    expect(byId.faultTolerance.state).toBe("off");
    expect(byId.i18n.variant).toBe("on");
    expect(byId.i18n.state).toBe("on");
  });

  test("missing feature in manifest falls back to the catalog default variant", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      // manifest has no `husky` key — list falls back to the
      // catalog default (which is variants[0] = "on").
      manifest: { schema: 1, kitVersion: "0.1.0", features: {} },
    });
    const out = await runList("/tmp/proj", deps);
    expect(out.ok).toBe(true);
    const husky = out.rows.find((r) => r.id === "husky");
    expect(husky.variant).toBe("on");
  });

  test("state is 'on' for non-OFF values, 'off' for OFF values (literal 'off' AND 'none')", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      manifest: {
        schema: 1,
        kitVersion: "0.1.0",
        features: {
          js: "none", // 'none' is the OFF value for `js`
          jsLib: "none", // 'none' is the OFF value for `jsLib`
          husky: "off", // 'off' is the OFF value for `husky`
          faultTolerance: "on",
          i18n: "on",
        },
      },
    });
    const out = await runList("/tmp/proj", deps);
    const byId = Object.fromEntries(out.rows.map((r) => [r.id, r]));
    expect(byId.js.state).toBe("off");
    expect(byId.jsLib.state).toBe("off");
    expect(byId.husky.state).toBe("off");
    expect(byId.faultTolerance.state).toBe("on");
    expect(byId.i18n.state).toBe("on");
  });
});

/* -------------------------------------------------------------------- */
/* I4.1 — error path                                                      */
/* -------------------------------------------------------------------- */

describe("runList — error path (I4.1)", () => {
  test("returns {ok:false, reason} when manifest is missing (engine.readManifest returns null)", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({ manifest: null });
    const out = await runList("/tmp/proj", deps);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/no manifest/i);
  });

  test("does NOT call ui.renderFeatureTable on the error path", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({ manifest: null });
    await runList("/tmp/proj", deps);
    expect(deps.ui.renderFeatureTable).not.toHaveBeenCalled();
  });

  test("catches a thrown engine.readManifest and returns {ok:false}", async () => {
    const deps = baseDeps();
    deps.engine = {
      getFeatureCatalog: jest.fn(() => CATALOG),
      readManifest: jest.fn(() => {
        throw new Error("disk full");
      }),
    };
    const out = await runList("/tmp/proj", deps);
    expect(out.ok).toBe(false);
    expect(out.reason).toMatch(/disk full/);
  });
});

/* -------------------------------------------------------------------- */
/* I4.2 — pretty-printing via ui.renderFeatureTable                       */
/* -------------------------------------------------------------------- */

describe("runList — ui.renderFeatureTable wiring (I4.2)", () => {
  test("on success, calls ui.renderFeatureTable with the rows", async () => {
    const deps = baseDeps();
    deps.engine = makeEngine({
      manifest: {
        schema: 1,
        kitVersion: "0.1.0",
        features: { js: "typescript", husky: "on" },
      },
    });
    await runList("/tmp/proj", deps);
    expect(deps.ui.renderFeatureTable).toHaveBeenCalledTimes(1);
    const arg = deps.ui.renderFeatureTable.mock.calls[0][0];
    expect(Array.isArray(arg)).toBe(true);
    expect(arg).toHaveLength(CATALOG.length);
    // Every row has {id, state, variant}
    for (const row of arg) {
      expect(typeof row.id).toBe("string");
      expect(typeof row.state).toBe("string");
      expect(typeof row.variant).toBe("string");
    }
  });
});
