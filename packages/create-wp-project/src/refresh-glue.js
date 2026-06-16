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
import { applyComposerPatches } from "./composer-patches.js";
import {
  readProjectConfigFromDir,
  projectConfigToAnswers,
} from "./project-config-io.js";

const CONDITIONAL_GLUE = ["tsconfig.json", "package.json"];

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

  const gens = getGenerators(features);
  const deps = {};
  const devDeps = {};
  let composerPatches = null;

  for (const g of gens) {
    const out = g.run(ctx);
    Object.assign(deps, out.deps || {});
    Object.assign(devDeps, out.devDeps || {});
    if (out.composerPatches) {
      composerPatches = composerPatches || {
        require: {},
        repositories: [],
        suggest: {},
      };
      if (out.composerPatches.require) {
        Object.assign(composerPatches.require, out.composerPatches.require);
      }
      if (out.composerPatches.repositories) {
        composerPatches.repositories.push(...out.composerPatches.repositories);
      }
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

  if (features.js === "none" && features.husky === "off") {
    delete files["package.json"];
  }

  if ("composer.json" in files && composerPatches) {
    let composer = JSON.parse(files["composer.json"]);
    composer = applyComposerPatches(composer, composerPatches);
    files["composer.json"] = JSON.stringify(composer, null, 2) + "\n";
  }

  // Core's project.config.json template omits `features` (synced
  // separately by manifest helpers). Merge so refreshGlue does not
  // clobber the feature state addFeature/removeFeature just wrote.
  if ("project.config.json" in files) {
    const cfg = JSON.parse(files["project.config.json"]);
    cfg.features = { ...features };
    files["project.config.json"] = JSON.stringify(cfg, null, 2) + "\n";
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
    if (
      rel === "package.json" &&
      !(features.js === "none" && features.husky === "off")
    ) {
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
