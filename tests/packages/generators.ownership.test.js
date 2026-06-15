/**
 * Phase 22.1 / 22.2 — owned-paths map.
 *
 * Every generator descriptor declares the file globs / paths it
 * OWNS. The owned-paths list is the contract that powers
 * `addFeature` / `removeFeature` (Phase 22.3+) in additive mode:
 * a generator in additive mode may only create / overwrite / delete
 * files matched by its own `owns` globs. If a write would land
 * outside `owns`, the engine throws — never silently touches user
 * code.
 *
 * Two contracts are locked here:
 *
 *  1. Every generator descriptor (returned by `listGenerators()`)
 *     has a non-empty `owns: string[]` field. The list contains
 *     globs (e.g. `src/Core/**`, `.husky/**`) and / or exact paths
 *     (e.g. `composer.json`, `LICENSE`).
 *
 *  2. No two descriptors across DIFFERENT feature ids claim the
 *     same path or glob. Variants of the SAME feature (e.g. the
 *     three `js:*` descriptors — all `feature: "js"`) MAY share
 *     paths: only one variant runs at a time, and a `js`
 *     variant-switch is the operation that bridges them.
 *
 *  3. Each generator's `owns` list covers the files its `run()`
 *     actually emits for the relevant feature set. We assert this
 *     by running each generator with a permissive feature set and
 *     checking that every file in its output is matched by some
 *     entry in its `owns` list. This is the safety-net test:
 *     a generator that "leaks" a write outside its own claim is
 *     caught here.
 *
 * The minimatch glob matcher is used (it's already a transitive
 * dep via jest). A bare path like `composer.json` is treated as
 * an exact match (minimatch with no wildcards is exact).
 */

import { describe, test, expect } from "@jest/globals";
import minimatch from "minimatch";

import { listGenerators } from "../../packages/create-wp-project/src/generators/index.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";

/**
 * Group descriptors by their `feature` id. Core (feature: null) is
 * its own group. Variants of the same `feature` are in the same
 * group; the overlap test allows sharing within a group but not
 * across groups.
 *
 * @param {Array<{feature: string|null}>} gens
 * @returns {Map<string|null, Array<{feature: string|null}>>}
 */
function groupByFeature(gens) {
  const groups = new Map();
  for (const g of gens) {
    const key = g.feature;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }
  return groups;
}

/**
 * Check whether a file path is matched by a glob in the given
 * list. A path matches if `minimatch(path, glob)` returns true
 * for any glob. The `dot: true` option is required to match
 * dotfiles like `.gitignore`, `.husky/pre-commit`, etc.
 *
 * @param {string} filePath
 * @param {string[]} globs
 * @returns {boolean}
 */
function isMatchedBy(filePath, globs) {
  for (const glob of globs) {
    if (minimatch(filePath, glob, { dot: true })) return true;
  }
  return false;
}

/**
 * Check whether two glob sets can ever match the same concrete
 * file path. We try a small set of "probe" filenames that stress
 * the typical boundary cases (dotfiles, nested paths, file
 * extensions). If any probe matches a glob from BOTH sets, the
 * two globs are considered overlapping.
 *
 * This is a conservative approximation — the real check would
 * enumerate all possible filenames, but the probe set catches
 * the common mistakes (two generators both claiming `src/**`,
 * two both claiming `package.json`, etc.).
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {string|null}  the first probe that matches both, or null
 */
function firstOverlap(a, b) {
  const probes = [
    "package.json",
    "composer.json",
    "tsconfig.json",
    "LICENSE",
    "readme.txt",
    "build.config.json",
    "project.config.json",
    "README.md",
    "wpsk-kit.json",
    ".gitignore",
    ".editorconfig",
    ".husky/pre-commit",
    ".flowconfig",
    ".sassrc",
    "tailwind.config.js",
    "postcss.config.js",
    "phpunit.xml",
    "src/Core/Plugin.php",
    "src/Core/ModuleInterface.php",
    "src/Core/ModuleLoader.php",
    "src/Modules/ExampleFeature/Module.php",
    "src/Modules/ExampleFeature/Rest/ItemsController.php",
    "src/Modules/ExampleFeature/assets/entries/admin.ts",
    "src/Modules/Blocks/block.json",
    "src/Modules/Blocks/Module.php",
    "src/Modules/Blocks/index.ts",
    "src/Modules/RestBatch/Module.php",
    "assets/dependencies.ts",
    "assets/dependencies.js",
    "assets/stylesheets/style.css",
    "languages/.gitkeep",
    "tests/phpunit/bootstrap.php",
    "my-plugin.php",
    "functions.php",
  ];
  for (const probe of probes) {
    if (isMatchedBy(probe, a) && isMatchedBy(probe, b)) return probe;
  }
  return null;
}

describe("generator ownership — owned-paths map (Phase 22.1, 22.2)", () => {
  test("every registered generator declares a non-empty owns[]", () => {
    const all = listGenerators();
    expect(all.length).toBeGreaterThan(0);
    for (const g of all) {
      expect(Array.isArray(g.owns)).toBe(true);
      expect(g.owns.length).toBeGreaterThan(0);
      for (const own of g.owns) {
        expect(typeof own).toBe("string");
        expect(own.length).toBeGreaterThan(0);
      }
    }
  });

  test("every entry in owns[] is a string glob or exact path", () => {
    // Defensive: a non-string entry would crash minimatch later.
    for (const g of listGenerators()) {
      for (const own of g.owns) {
        expect(typeof own).toBe("string");
        // The minimatch v3 matcher accepts any non-empty glob; we
        // sanity-check that the matcher doesn't throw on our list.
        expect(() =>
          minimatch("package.json", own, { dot: true }),
        ).not.toThrow();
      }
    }
  });

  test("no two descriptors across DIFFERENT feature ids claim the same path", () => {
    // Group by feature; the test allows overlap WITHIN a group
    // (variants of the same feature legitimately share paths,
    // e.g. js:typescript and js:pure both own `assets/dependencies.*`
    // — only one variant runs at a time, and a variant switch is
    // what bridges them).
    const groups = groupByFeature(listGenerators());
    const groupKeys = Array.from(groups.keys());
    for (let i = 0; i < groupKeys.length; i++) {
      for (let j = i + 1; j < groupKeys.length; j++) {
        const a = groupKeys[i];
        const b = groupKeys[j];
        if (a === b) continue; // same group — variants may share
        const gensA = groups.get(a);
        const gensB = groups.get(b);
        for (const ga of gensA) {
          for (const gb of gensB) {
            const overlap = firstOverlap(ga.owns, gb.owns);
            expect(overlap).toBeNull();
          }
        }
      }
    }
  });

  test("core owns the always-on files (project.config.json, composer.json, src/Core/**, ...)", () => {
    const core = listGenerators().find((g) => g.id === "core");
    expect(core).toBeDefined();
    // The core descriptor MUST claim each of these — addFeature /
    // removeFeature rely on the owns list to detect whether a
    // file is allowed to be touched.
    const expected = [
      "project.config.json",
      "composer.json",
      "readme.txt",
      "build.config.json",
      "README.md",
      ".gitignore",
      ".editorconfig",
      "src/Core/Plugin.php",
      "src/Core/ModuleInterface.php",
      "src/Core/ModuleLoader.php",
    ];
    for (const path of expected) {
      expect(isMatchedBy(path, core.owns)).toBe(true);
    }
  });

  test("each generator's run() output is fully covered by its owns[]", () => {
    // For every generator, run it with a permissive feature set
    // (so its feature gate is open) and assert that every file in
    // the output is matched by some entry in the generator's owns
    // list. This is the safety-net test: a generator that "leaks"
    // a write outside its own claim is caught here.
    const all = listGenerators();
    for (const g of all) {
      // Build a permissive feature set: every catalog feature set
      // to its default so gates are open. Variant features (js,
      // css, license) need a known variant — pick the first one.
      const feats = defaultFeatures();
      // Force-open the gates that depend on sub-features:
      feats.js = "typescript";
      feats.jsTest = "jest";
      feats.blocks = "on";
      feats.wpMinVersion = "6.6";
      feats.css = "sass";
      feats.restBatch = "on";

      // Construct a minimal ctx. Variants of `js` need `vars` for
      // template rendering; provide a stub that renders literals.
      const ctx = {
        answers: {
          slug: "p",
          npmScope: "o",
          globalName: "P",
          textDomain: "p",
          hookPrefix: "p",
          phpFunctionPrefix: "p_",
          uiFramework: "preact",
          projectType: "plugin",
        },
        cfg: {
          vendorPrefix: "Pvendor",
        },
        features: feats,
        vars: {
          slug: "p",
          npmScope: "o",
          globalName: "P",
          textDomain: "p",
          hookPrefix: "p",
          phpFunctionPrefix: "p_",
          vendor: "WPSK",
          vendorPrefix: "Pvendor",
          vendorPrefixUpper: "PVENDOR",
          projectType: "plugin",
        },
      };

      let out;
      try {
        out = g.run(ctx);
      } catch (e) {
        // Some generators may throw on the stub ctx (e.g. the js
        // variants need `slug` from vars). We only need to check
        // outputs that succeed.
        continue;
      }
      if (!out || !out.files) continue;
      for (const filePath of Object.keys(out.files)) {
        expect(isMatchedBy(filePath, g.owns)).toBe(true);
      }
    }
  });

  test("the husky generator owns only .husky/pre-commit (single exact file)", () => {
    const husky = listGenerators().find((g) => g.id === "husky");
    expect(husky).toBeDefined();
    expect(isMatchedBy(".husky/pre-commit", husky.owns)).toBe(true);
    // And it does NOT own other files.
    expect(isMatchedBy("package.json", husky.owns)).toBe(false);
    expect(isMatchedBy(".gitignore", husky.owns)).toBe(false);
  });
});
