/**
 * Re-emit core-owned glue files after feature mutations.
 *
 * addFeature / removeFeature only write a single feature's owned
 * paths. Glue that depends on the full feature set (package.json
 * scripts, tsconfig.json, composer.json extra/strauss, bootstrap PHP)
 * lives in the core generator — refreshGlue re-runs core + merges
 * generator deps the same way scaffoldProject does.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import minimatch from "minimatch";

import { descriptor as coreDescriptor } from "./generators/core.js";
import { getGenerators } from "./generators/index.js";
import { tplVars } from "./generators/_templates.js";
import {
  applyComposerPatches,
  mergeComposerPatchAccumulator,
} from "./composer-patches.js";
import {
  readProjectConfigFromDir,
  projectConfigToAnswers,
} from "./project-config-io.js";

const CONDITIONAL_GLUE = ["tsconfig.json", "package.json"];

/**
 * `package.json` is omitted when the project has no Node toolchain
 * to drive — i.e. JS is fully off (`js === "none"`) AND husky is
 * off (no pre-commit hook runner). Without both, a consumer
 * expects a package.json (npm scripts, lint-staged config, …).
 *
 * Centralised here so `scaffoldProject` (Phase 21.13) and
 * `refreshGlue` (Phase 22) share one source of truth for the
 * gate — the two previously inlined the same boolean and a
 * future "add another no-package.json case" patch would
 * otherwise need to touch both call sites.
 *
 * @param {Record<string,string|undefined>} features
 * @returns {boolean}
 */
export function shouldEmitPackageJson(features) {
  const f = features || {};
  return !(f.js === "none" && f.husky === "off");
}

/**
 * @param {string} rel
 * @returns {boolean}
 */
function isOwnedByCore(rel) {
  return coreDescriptor.owns.some((glob) =>
    minimatch(rel, glob, { dot: true }),
  );
}

/**
 * @param {string} dir
 * @param {Record<string,string>} features
 * @returns {Promise<string[]>} written relative paths (and "-path" for removals)
 */
export async function refreshGlue(dir, features) {
  const { cfg } = await readProjectConfigFromDir(dir, "refreshGlue");
  const answers = projectConfigToAnswers(cfg);
  const vars = tplVars(answers, cfg);
  const ctx = { answers, cfg, features, vars };

  const coreOut = coreDescriptor.run(ctx);
  const files = { ...coreOut.files };

  // Filter core out — it was already run above; running it again
  // via the loop would double-count any future deps it returns.
  const gens = getGenerators(features).filter((g) => g.id !== "core");
  const deps = {};
  const devDeps = {};
  let composerPatches = null;
  const composerSuggest = {};

  for (const g of gens) {
    const out = g.run(ctx);
    Object.assign(deps, out.deps || {});
    Object.assign(devDeps, out.devDeps || {});
    if (out.composerPatches) {
      composerPatches = mergeComposerPatchAccumulator(
        composerPatches,
        out.composerPatches,
      );
    }
    if (out.composerSuggest) {
      Object.assign(composerSuggest, out.composerSuggest);
    }
  }

  if ("package.json" in files) {
    const pkg = JSON.parse(files["package.json"]);
    if (Object.keys(deps).length) {
      pkg.dependencies = { ...pkg.dependencies, ...deps };
    }
    if (Object.keys(devDeps).length) {
      pkg.devDependencies = { ...pkg.devDependencies, ...devDeps };
    }
    files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
  }

  if (!shouldEmitPackageJson(features)) {
    delete files["package.json"];
  }

  if ("composer.json" in files) {
    let composer = JSON.parse(files["composer.json"]);
    if (composerPatches) {
      composer = applyComposerPatches(composer, composerPatches);
    }
    if (Object.keys(composerSuggest).length) {
      composer.suggest = { ...(composer.suggest || {}), ...composerSuggest };
    }
    files["composer.json"] = JSON.stringify(composer, null, 2) + "\n";
  }

  // Core's project.config.json template has a fixed set of fields.
  // Merge the on-disk cfg so user-added keys are preserved, then
  // stamp the current features so the manifest stays in sync.
  if ("project.config.json" in files) {
    const templateCfg = JSON.parse(files["project.config.json"]);
    const merged = { ...cfg, ...templateCfg, features: { ...features } };
    files["project.config.json"] = JSON.stringify(merged, null, 2) + "\n";
  }

  const written = [];
  for (const [rel, content] of Object.entries(files)) {
    if (!isOwnedByCore(rel)) continue;
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    written.push(rel);
  }

  for (const rel of CONDITIONAL_GLUE) {
    if (!isOwnedByCore(rel)) continue;
    if (rel in files) continue;
    if (rel === "package.json" && shouldEmitPackageJson(features)) {
      continue;
    }
    if (rel === "tsconfig.json" && features.js !== "none") {
      continue;
    }
    const abs = path.join(dir, rel);
    try {
      await fs.unlink(abs);
      written.push(`-${rel}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return written;
}
