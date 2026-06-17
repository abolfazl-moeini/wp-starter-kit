/**
 * Phase 21.1 / 21.2 — generator registry.
 *
 * The registry is the central dispatch from a feature set to a list
 * of "enabled" generator descriptors. Each generator owns a list of
 * files it would contribute, and gets gated on the feature set:
 *
 *   - core       — always runs (no feature gate)
 *   - js         — gated on `js` variant; only the matching variant runs
 *   - husky      — gated on `husky === "on"`
 *   - exampleFeature, vendorScoping, restBatch, i18n, phpTest, license,
 *                  blocks, css — same pattern: a feature id (and,
 *                  for some, a required sub-variant on another feature)
 *                  decides whether the generator contributes files.
 *
 * The registry is the "source of truth" for which features turn on
 * which generator. Phase 22's `addFeature` will look up the descriptor
 * to know which files to write / own.
 *
 * Two contracts are locked here:
 *  1. `getGenerators(features)` returns an array of enabled
 *     generator descriptors in a stable order (core first, then
 *     js, then the toggle features in their catalog order).
 *  2. Each descriptor has `{ id, feature, variant?, owns, run }`
 *     where `run(ctx)` returns a `{ files, dirs, deps, devDeps }`
 *     contribution that the scaffold merges into the final write set.
 *  3. `getGenerators({})` (the all-default set) returns at least
 *     the core descriptor + the js:typescript variant + every
 *     toggle whose default is `on`. This is the BC shape — the
 *     default-feature scaffold must produce the same file set the
 *     legacy `scaffoldProject` produced.
 */

import { describe, test, expect } from "@jest/globals";
import {
  getGenerators,
  listGenerators,
  findGenerator,
} from "../../packages/create-wp-project/src/generators/index.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

describe("getGenerators(features) — registry dispatch (Phase 21.1/21.2)", () => {
  test("returns at least one generator (core) even with an empty feature set", () => {
    const gens = getGenerators({});
    expect(Array.isArray(gens)).toBe(true);
    const ids = gens.map((g) => g.id);
    expect(ids).toContain("core");
  });

  test("core runs for ANY feature set (always-on)", () => {
    const sets = [
      {},
      defaultFeatures(),
      { js: "none", husky: "off", exampleFeature: "off" },
      { js: "typescript", exampleFeature: "on", i18n: "on" },
    ];
    for (const s of sets) {
      const ids = getGenerators(s).map((g) => g.id);
      expect(ids).toContain("core");
    }
  });

  test("js:none → NO js generator is enabled (no assets/, no tsconfig)", () => {
    const gens = getGenerators({ js: "none" });
    const ids = gens.map((g) => g.id);
    expect(ids).not.toContain("js:typescript");
    expect(ids).not.toContain("js:pure");
    expect(ids).not.toContain("js:flow");
  });

  test("js:typescript → only the typescript js variant is enabled", () => {
    const gens = getGenerators({ js: "typescript" });
    const ids = gens.map((g) => g.id);
    expect(ids).toContain("js:typescript");
    expect(ids).not.toContain("js:pure");
    expect(ids).not.toContain("js:flow");
  });

  test("js:flow → only the flow variant is enabled", () => {
    const gens = getGenerators({ js: "flow" });
    const ids = gens.map((g) => g.id);
    expect(ids).toContain("js:flow");
    expect(ids).not.toContain("js:typescript");
  });

  test("js:pure → only the pure variant is enabled", () => {
    const gens = getGenerators({ js: "pure" });
    const ids = gens.map((g) => g.id);
    expect(ids).toContain("js:pure");
    expect(ids).not.toContain("js:typescript");
  });

  test("husky:on → husky generator is enabled", () => {
    const gens = getGenerators({ husky: "on" });
    expect(gens.map((g) => g.id)).toContain("husky");
  });

  test("husky:off → husky generator is NOT enabled", () => {
    const gens = getGenerators({ husky: "off" });
    expect(gens.map((g) => g.id)).not.toContain("husky");
  });

  test("exampleFeature:off → no exampleFeature generator is enabled", () => {
    const gens = getGenerators({ exampleFeature: "off" });
    expect(gens.map((g) => g.id)).not.toContain("exampleFeature");
  });

  test("vendorScoping:on → vendorScoping generator is enabled (and the generated strauss.json does NOT exclude WPDev — §0.4.1)", () => {
    const gens = getGenerators({ vendorScoping: "on" });
    expect(gens.map((g) => g.id)).toContain("vendorScoping");
    const vs = gens.find((g) => g.id === "vendorScoping");
    // Phase 21.8: per plan §0.4.1 the consumer scaffold's strauss.json
    // must NOT contain "WPDev" in exclude_from_prefix. We assert
    // that the generator's run() output, given minimal ctx, does
    // not emit a strauss.json with "WPDev" in the exclusion list.
    const ctx = {
      answers: {
        slug: "p",
        npmScope: "o",
        globalName: "P",
        textDomain: "p",
        hookPrefix: "p",
        phpFunctionPrefix: "p_",
        uiFramework: "preact",
      },
      cfg: { vendorPrefix: "Pvendor" },
      features: { vendorScoping: "on" },
      vars: {},
    };
    const out = vs.run(ctx);
    const straussPath = "strauss.json";
    expect(out.files[straussPath]).toBeDefined();
    expect(out.files[straussPath]).not.toMatch(/"WPDev"/);
  });

  test("phpTest:phpunit → phpTest generator is enabled", () => {
    const gens = getGenerators({ phpTest: "phpunit" });
    expect(gens.map((g) => g.id)).toContain("phpTest");
  });

  test("phpTest:none → phpTest generator is NOT enabled", () => {
    const gens = getGenerators({ phpTest: "none" });
    expect(gens.map((g) => g.id)).not.toContain("phpTest");
  });

  test("i18n:off → i18n generator is NOT enabled", () => {
    const gens = getGenerators({ i18n: "off" });
    expect(gens.map((g) => g.id)).not.toContain("i18n");
  });

  test("blocks:on + js:typescript + wpMinVersion:6.0 → blocks generator is enabled", () => {
    const gens = getGenerators({
      js: "typescript",
      blocks: "on",
      wpMinVersion: "6.0",
    });
    expect(gens.map((g) => g.id)).toContain("blocks");
  });

  test("blocks:on + js:none → blocks generator is enabled (PHP-first)", () => {
    const gens = getGenerators({ js: "none", blocks: "on" });
    expect(gens.map((g) => g.id)).toContain("blocks");
  });

  test("restBatch:on + js:typescript → restBatch generator is enabled", () => {
    const gens = getGenerators({ js: "typescript", restBatch: "on" });
    expect(gens.map((g) => g.id)).toContain("restBatch");
  });

  test("restBatch:on + js:none → restBatch generator is NOT enabled (JS-half gate)", () => {
    const gens = getGenerators({ js: "none", restBatch: "on" });
    expect(gens.map((g) => g.id)).not.toContain("restBatch");
  });

  test("css:tailwind + js:typescript → css generator is enabled", () => {
    const gens = getGenerators({ js: "typescript", css: "tailwind" });
    expect(gens.map((g) => g.id)).toContain("css");
  });

  test("css:none + js:typescript → css generator is NOT enabled", () => {
    const gens = getGenerators({ js: "typescript", css: "none" });
    expect(gens.map((g) => g.id)).not.toContain("css");
  });

  test("css:tailwind + js:none → css generator is NOT enabled (js gate)", () => {
    const gens = getGenerators({ js: "none", css: "tailwind" });
    expect(gens.map((g) => g.id)).not.toContain("css");
  });

  test("license:gpl2 → license generator is enabled", () => {
    const gens = getGenerators({ license: "gpl2" });
    expect(gens.map((g) => g.id)).toContain("license");
  });

  test("default feature set includes core + js:typescript + every default-on toggle (BC shape)", () => {
    const gens = getGenerators(defaultFeatures());
    const ids = gens.map((g) => g.id);
    // core + js + every toggle whose default is "on" must be present.
    expect(ids).toContain("core");
    expect(ids).toContain("js:typescript");
    expect(ids).toContain("husky");
    expect(ids).toContain("vendorScoping");
    expect(ids).toContain("exampleFeature");
    expect(ids).toContain("i18n");
    // phpTest default = "phpunit" → must include phpTest
    expect(ids).toContain("phpTest");
    // license default = "gpl2" → must include license
    expect(ids).toContain("license");
    // css default = "none" → no css
    expect(ids).not.toContain("css");
    // restBatch default = "off" → no restBatch
    expect(ids).not.toContain("restBatch");
    // blocks default = "off" → no blocks
    expect(ids).not.toContain("blocks");
  });

  test("every descriptor has the required shape { id, feature, owns, run }", () => {
    const gens = getGenerators(defaultFeatures());
    for (const g of gens) {
      expect(typeof g.id).toBe("string");
      expect(g.id.length).toBeGreaterThan(0);
      // `feature` may be null for the always-on core generator
      expect(g.feature === null || typeof g.feature === "string").toBe(true);
      expect(Array.isArray(g.owns)).toBe(true);
      expect(typeof g.run).toBe("function");
    }
  });

  test("core is listed first (so scaffold writes the canonical set in deterministic order)", () => {
    const gens = getGenerators(defaultFeatures());
    expect(gens[0].id).toBe("core");
  });

  test("descriptors are returned in a stable order across calls", () => {
    // Two calls with the same feature set must produce the same
    // descriptor sequence — this matters for idempotency (Phase 21.9)
    // because generators must not interleave their writes in a way
    // that depends on insertion order.
    const a = getGenerators(defaultFeatures()).map((g) => g.id);
    const b = getGenerators(defaultFeatures()).map((g) => g.id);
    expect(a).toEqual(b);
  });
});

describe("listGenerators() — full catalog (Phase 21.2)", () => {
  test("returns the full list of registered generators (every feature id+variant known to the registry)", () => {
    const all = listGenerators();
    expect(Array.isArray(all)).toBe(true);
    const ids = all.map((g) => g.id);
    // Core is always in the list.
    expect(ids).toContain("core");
    // Every js variant is in the list.
    expect(ids).toContain("js:typescript");
    expect(ids).toContain("js:pure");
    expect(ids).toContain("js:flow");
    // Every toggle is in the list.
    expect(ids).toContain("husky");
    expect(ids).toContain("vendorScoping");
    expect(ids).toContain("exampleFeature");
    expect(ids).toContain("restBatch");
    expect(ids).toContain("i18n");
    expect(ids).toContain("phpTest");
    expect(ids).toContain("license");
    expect(ids).toContain("blocks");
    expect(ids).toContain("css");
  });
});

describe("findGenerator(id) — registry lookup (Phase 21.2)", () => {
  test("returns the descriptor for a known id", () => {
    const g = findGenerator("core");
    expect(g).not.toBeNull();
    expect(g.id).toBe("core");
  });

  test("returns null for an unknown id", () => {
    expect(findGenerator("does-not-exist")).toBeNull();
  });
});
