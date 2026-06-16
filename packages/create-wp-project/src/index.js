/**
 * @wpsk/create-wp-project — minimal Node scaffold for a new wp-starter-kit
 * project (Phase 8).
 *
 * The mrlogistic approach was a Yeoman generator. The wp-starter-kit
 * version uses a tiny in-process Node script (no Plop/Yeoman dependency)
 * that:
 *
 *   1. Accepts an `ScaffoldAnswers` shape (slug, scope, globalName, ...).
 *   2. Validates the answers (`validateAnswers`).
 *   3. Renders each template with `{{token}}` substitution.
 *   4. Writes the output to a target directory.
 *
 * Usage (CLI):
 *   node packages/create-wp-project/src/index.js [target-dir]
 *
 * When called without args, the script reads answers from `WPSK_ANSWERS_JSON`
 * env var. When called from PHPUnit or another test, import the named
 * exports and drive `scaffoldProject()` directly.
 *
 * -----------------------------------------------------------------------
 * Phase 20 — Engine public API (Appendix C of plan.v3.md)
 * -----------------------------------------------------------------------
 * The CLI (plan.installer.md) and kit scripts depend on these named
 * exports. They are the *engine* surface; the rest of this file is
 * the legacy `scaffoldProject` and its answers-based template engine,
 * preserved verbatim for BC. The Phase 21+ work wires the
 * `scaffoldProject` body to the feature-aware generators — but the
 * Phase 20 work is purely additive: every new export lives in its
 * own module and is re-exported from this file via the block at
 * the bottom.
 */

import { promises as fs } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

// Phase 20 — feature model + manifest + validation + presets.
// Each lives in its own module so the boundary is testable in
// isolation; this file re-exports the public API.
import {
  getFeatureCatalog,
  defaultFeatures,
  validateFeatureSet,
} from "./features.js";
import {
  buildManifest,
  readManifest,
  writeManifest,
  syncFeaturesToConfig,
  DEFAULT_DIST_MODE,
} from "./manifest.js";
import { updateJsonFile } from "./json-utils.js";
import { getPresets, applyPreset } from "./presets.js";
// Phase 21 — generator registry. The scaffold runs the
// enabled generators and merges their contributions into the
// final write set. See src/generators/index.js for the
// dispatch table.
import { getGenerators } from "./generators/index.js";
import { tplVars as tplVarsFromGenerators } from "./generators/_templates.js";
// Phase 22 — additive feature mutations. The installer's
// `wpsk add <feature>` and `wpsk remove <feature>` commands
// call these directly. Both honor the same in-memory-then-write
// safety contract the scaffold path uses.
import { addFeature } from "./addFeature.js";
import { removeFeature } from "./removeFeature.js";
//
// Phase 24 (24.1–24.6) — migrations registry, selector, and
// runner live under `./migrations/index.js`. Re-exported
// here by the 24.13 follow-up (this commit) so the CLI
// imports them from the engine surface (`@wpsk/create-wp-project`)
// rather than deep-importing the file path.
import {
  getMigrations,
  selectMigrations,
  runMigrations,
  compareSemver,
} from "./migrations/index.js";
//
// Phase 24.7–24.10 — planUpdate, doctor, getDepVersions.
// The dry-run planner, the project's health check, and the
// dep-version registry the planner diffs against.
import { planUpdate } from "./plan-update.js";
import { doctorProject } from "./doctor.js";
import { getDepVersions } from "./dep-versions.js";
//
// Phase 24.12–24.13 — getKitStatus. The installer's `wpsk
// info` command runs this to surface kitVersion, distMode,
// features, and an optional `updateAvailable` signal (driven
// by an injected `lookupLatest` that the CLI wires to the
// npm registry).
import { getKitStatus } from "./kit-status.js";

/* -------------------------------------------------------------------- */
/* Types                                                                */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} ScaffoldAnswers
 * @property {string} slug
 * @property {string} npmScope       e.g. 'myorg' (no @)
 * @property {string} globalName     e.g. 'MyProject'
 * @property {string} [localizeVar]  e.g. 'MyProjectLoc' (inferred from globalName)
 * @property {string} textDomain
 * @property {string} hookPrefix
 * @property {string} [depsBundle]   e.g. 'my-project-deps.js' (inferred from slug)
 * @property {string} phpFunctionPrefix e.g. 'myprj_'
 * @property {'preact'|'react'} uiFramework
 * @property {'plugin'|'theme'} [projectType]  Phase 11: 'plugin' (default) emits
 *                                             `{slug}.php` as the primary
 *                                             bootstrap; 'theme' (legacy)
 *                                             emits `functions.php` and is
 *                                             kept for BC only.
 */

/* -------------------------------------------------------------------- */
/* validateAnswers                                                      */
/* -------------------------------------------------------------------- */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SCOPE_RE = /^[a-z0-9][a-z0-9-]*$/; // npmScope is the part after '@'
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/; // JS identifier
const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*$/; // text-domain / hook-prefix slug

export function validateAnswers(a) {
  const errors = {};

  if (!a || typeof a !== "object") {
    return { ok: false, errors: { _root: "answers must be an object" } };
  }
  if (!a.slug || !SLUG_RE.test(a.slug)) {
    errors.slug = "slug must be lowercase kebab-case (a-z, 0-9, dashes)";
  }
  if (!a.npmScope || !SCOPE_RE.test(a.npmScope)) {
    errors.npmScope = "npmScope must be lowercase kebab-case (no @)";
  }
  if (!a.globalName || !IDENT_RE.test(a.globalName)) {
    errors.globalName = "globalName must be a valid JS identifier";
  }
  if (
    a.localizeVar !== undefined &&
    a.localizeVar !== "" &&
    !IDENT_RE.test(a.localizeVar)
  ) {
    errors.localizeVar = "localizeVar must be a valid JS identifier";
  }
  if (!a.textDomain || !DOMAIN_RE.test(a.textDomain)) {
    errors.textDomain = "textDomain must be lowercase kebab-case";
  }
  if (!a.hookPrefix || !DOMAIN_RE.test(a.hookPrefix)) {
    errors.hookPrefix = "hookPrefix must be lowercase kebab-case";
  }
  if (
    a.phpFunctionPrefix !== undefined &&
    a.phpFunctionPrefix !== "" &&
    !/^[a-z][a-z0-9_]*_$/.test(a.phpFunctionPrefix)
  ) {
    errors.phpFunctionPrefix =
      "phpFunctionPrefix must be lowercase letters/digits/underscores, ending with underscore";
  }
  if (a.uiFramework !== "preact" && a.uiFramework !== "react") {
    errors.uiFramework = 'uiFramework must be "preact" or "react"';
  }
  if (
    a.projectType !== undefined &&
    a.projectType !== "" &&
    a.projectType !== "plugin" &&
    a.projectType !== "theme"
  ) {
    errors.projectType =
      'projectType must be "plugin" or "theme" (default: "plugin")';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------- */
/* answersToProjectConfig                                              */
/* -------------------------------------------------------------------- */

export function answersToProjectConfig(a) {
  const cfg = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar || a.globalName + "Loc",
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: "@" + a.npmScope,
    depsBundle: a.depsBundle || `${a.slug}-deps.js`,
    phpFunctionPrefix: a.phpFunctionPrefix || "wpsk_",
    uiFramework: a.uiFramework,
    projectType: a.projectType || "plugin",
    // Phase 11 v2 defaults — present in every scaffolded
    // project.config.json so consumers (readProjectConfig, REST
    // router, JS bundles) can rely on the keys without a follow-up
    // migration step. Override per-project by passing a non-default
    // value through answers (the renderer will use it).
    restNamespace: a.restNamespace || "wpsk/v1",
    vendorPrefix: a.vendorPrefix || "WpskVendor",
    phpMinVersion: a.phpMinVersion || "7.4",
    phpSourceVersion: a.phpSourceVersion || "8.1",
    batchEndpoint: a.batchEndpoint || "/batch/v1",
  };
  return cfg;
}

/* -------------------------------------------------------------------- */
/* renderTemplate                                                       */
/* -------------------------------------------------------------------- */

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Kit version that the scaffold stamps into the manifest's
 * `kitVersion` field. The Phase 20+ manifest uses this to
 * detect when a project needs a migration. Read at module
 * load time from the package's own package.json so a release
 * of @wpsk/create-wp-project automatically advances the
 * version. Falls back to "0.0.0" if the package.json is
 * missing (e.g. when the test runner inlines the module).
 */
function readKitVersion() {
  try {
    const pkgPath = modulePath2("..", "package.json");
    if (!existsSync(pkgPath)) return "0.0.0";
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Resolve a path relative to this module's directory. Mirrors
 * the helper in src/generators/_templates.js — duplicated here
 * to avoid a circular import (the templates module re-uses
 * helpers from this file).
 */
function modulePath2(...parts) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else {
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, ...parts);
}
const KIT_VERSION = readKitVersion();

export function renderTemplate(tmpl, vars) {
  return tmpl.replace(TOKEN_RE, (full, key) => {
    if (
      Object.prototype.hasOwnProperty.call(vars, key) &&
      vars[key] !== undefined &&
      vars[key] !== null
    ) {
      return String(vars[key]);
    }
    return full; // leave unknown tokens verbatim so missing config is loud
  });
}

/* -------------------------------------------------------------------- */
/* scaffoldProject                                                     */
/* -------------------------------------------------------------------- */

/**
 * @param {string} targetDir  absolute path where the project will be created.
 * @param {ScaffoldAnswers} answers
 * @param {Object} [options]
 * @param {Record<string,string>} [options.features]  Validated feature
 *    set; when absent, `defaultFeatures()` is used. Pre-Phase 21
 *    callers pass NO `options` at all — the answer-only call still
 *    works (BC: the default feature set produces the same file list
 *    the legacy scaffold produced).
 * @param {boolean} [options.force=false]  overwrite existing project
 *    files (project.config.json, src/Core/Plugin.php, etc.).
 *    Without --force the scaffold refuses to touch an existing
 *    project.
 * @returns {Promise<{ok: boolean, written?: string[], reason?: string}>}
 */
export async function scaffoldProject(targetDir, answers, options = {}) {
  // 1. Validate answers.
  const v = validateAnswers(answers);
  if (!v.ok) {
    return {
      ok: false,
      reason: "invalid answers: " + JSON.stringify(v.errors),
    };
  }

  // 2. Compute features. BC: absent options.features → defaults.
  const features = options.features || defaultFeatures();

  // 3. Validate the feature set. A violation must NOT write
  //    anything to disk (per the generator migration test).
  const fv = validateFeatureSet(features);
  if (!fv.ok) {
    const first = Object.entries(fv.errors)[0];
    return {
      ok: false,
      reason: `invalid feature set: ${first[0]}=${JSON.stringify(first[1])}`,
    };
  }

  // 4. Refuse to clobber an existing project unless --force is set.
  //    The sentinel is project.config.json — if it exists, the
  //    directory is treated as an existing project. Any other file
  //    the scaffold emits (src/Core/Plugin.php, etc.) is treated as
  //    a derivative of that sentinel and is protected by the same
  //    rule.
  if (!options.force) {
    try {
      await fs.access(path.join(targetDir, "project.config.json"));
      return {
        ok: false,
        reason: `project.config.json already exists at ${targetDir} — pass { force: true } to overwrite`,
      };
    } catch {
      /* good — does not exist */
    }
  }

  // 5. Build cfg + vars (the same way the legacy body did).
  const cfg = answersToProjectConfig(answers);
  const vars = tplVarsFromGenerators(answers, cfg);

  // 5b. Phase 23.A4: thread the framework path through to the
  //    composer.json template. The default lives in tplVars
  //    (../packages/framework — the sibling-project relative
  //    path that works when the consumer lives next to a kit
  //    checkout). Real kit installations override this via
  //    options.frameworkPath (the installer's own working
  //    directory is the source of truth for the absolute
  //    workspace path). When neither is set, the sibling-relative
  //    default stands and a real `composer install` will resolve
  //    wpsk/framework from the dev path repo.
  if (options.frameworkPath) {
    vars.frameworkPath = options.frameworkPath;
  }

  // 6. Run the registry. Each enabled generator contributes
  //    `files` (and optionally `dirs`, `deps`, `devDeps`). The
  //    core generator owns every always-on file; toggle
  //    generators contribute only when their gate is open. The
  //    final write set is the merge of all contributions, with
  //    later generators overwriting earlier ones on key
  //    collision (e.g. vendorScoping overrides core's
  //    strauss.json).
  const gens = getGenerators(features);
  const ctx = { answers, cfg, features, vars, options };
  const merged = { files: {}, dirs: [], deps: {}, devDeps: {} };
  const composerSuggest = {};
  let composerPatches = null;
  for (const g of gens) {
    const out = g.run(ctx);
    if (out.files) Object.assign(merged.files, out.files);
    if (out.dirs) merged.dirs.push(...out.dirs);
    if (out.deps) Object.assign(merged.deps, out.deps);
    if (out.devDeps) Object.assign(merged.devDeps, out.devDeps);
    if (out.composerSuggest)
      Object.assign(composerSuggest, out.composerSuggest);
    if (out.composerPatches) {
      composerPatches = composerPatches || {
        require: {},
        repositories: [],
        suggest: {},
      };
      if (out.composerPatches.require) {
        Object.assign(composerPatches.require, out.composerPatches.require);
      }
      if (out.composerPatches.suggest) {
        Object.assign(composerPatches.suggest, out.composerPatches.suggest);
      }
      if (out.composerPatches.repositories) {
        composerPatches.repositories.push(...out.composerPatches.repositories);
      }
    }
  }

  // Merge generator deps/devDeps into package.json when present.
  if ("package.json" in merged.files) {
    const pkg = JSON.parse(merged.files["package.json"]);
    if (Object.keys(merged.deps).length) {
      pkg.dependencies = { ...pkg.dependencies, ...merged.deps };
    }
    if (Object.keys(merged.devDeps).length) {
      pkg.devDependencies = { ...pkg.devDependencies, ...merged.devDeps };
    }
    merged.files["package.json"] = JSON.stringify(pkg, null, 2) + "\n";
  }

  // Merge composer patches / suggest from generators (wpdev, faultTolerance).
  if (
    "composer.json" in merged.files &&
    (Object.keys(composerSuggest).length || composerPatches)
  ) {
    const { applyComposerPatches } = await import("./composer-patches.js");
    let composer = JSON.parse(merged.files["composer.json"]);
    if (composerPatches) {
      composer = applyComposerPatches(composer, composerPatches);
    }
    if (Object.keys(composerSuggest).length) {
      composer.suggest = { ...(composer.suggest || {}), ...composerSuggest };
    }
    merged.files["composer.json"] = JSON.stringify(composer, null, 2) + "\n";
  }

  // 7. Phase 21.13 — package.json is omitted ONLY when
  //    js === "none" AND husky === "off" (no Node toolchain
  //    to drive). The core generator already gates the file
  //    on `js !== "none"`; this is the extra husky-gate.
  if (
    features.js === "none" &&
    features.husky === "off" &&
    "package.json" in merged.files
  ) {
    delete merged.files["package.json"];
  }

  // 8. Write files. The order is the merge order (registry
  //    order) so two runs with the same feature set produce
  //    the same byte sequence (idempotency, Phase 21.9/10).
  const written = [];
  // Ensure every directory touched exists. The merged.dirs list
  // is defensive (we mkdir parents on each write anyway), but a
  // pre-pass keeps the file set tidy.
  for (const d of merged.dirs) {
    await fs.mkdir(path.join(targetDir, d), { recursive: true });
  }
  for (const [rel, content] of Object.entries(merged.files)) {
    const abs = path.join(targetDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    written.push(rel);
  }

  // 9. Write the manifest. The manifest's `features` object
  //    is the validated feature set; `kitVersion` is the kit's
  //    own version; `distMode` defaults to "deps" (framework via
  //    wpsk/framework Composer dep; vendored is legacy).
  const manifest = buildManifest({
    kitVersion: KIT_VERSION,
    features,
    distMode: DEFAULT_DIST_MODE,
  });
  await writeManifest(targetDir, manifest);
  // The manifest is part of the consumer's durable state — add
  // it to the `written` list so callers can assert the full
  // file set returned by scaffoldProject.
  if (!written.includes("wpsk-kit.json")) {
    written.push("wpsk-kit.json");
  }

  // 10. Dual-write `features` into project.config.json so
  //    pre-Phase 20 readers (the kit's PHP classes, the JS
  //    asset bundle) can answer "which features are on?"
  //    without discovering wpsk-kit.json.
  await syncFeaturesToConfig(targetDir, features);

  return { ok: true, written };
}

/* -------------------------------------------------------------------- */
/* CLI entry                                                            */
/* -------------------------------------------------------------------- */

function parseAnswersFromEnv() {
  const raw = process.env.WPSK_ANSWERS_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseAnswersFromArgs(argv) {
  // Lightweight flag parser: --slug=foo --scope=bar --global=MyProject ...
  // Plus --target=<dir>. For interactive use the user can pipe in JSON.
  const a = {};
  let target = null;
  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else if (arg.startsWith("--slug=")) a.slug = arg.slice("--slug=".length);
    else if (arg.startsWith("--scope="))
      a.npmScope = arg.slice("--scope=".length);
    else if (arg.startsWith("--global="))
      a.globalName = arg.slice("--global=".length);
    else if (arg.startsWith("--domain="))
      a.textDomain = arg.slice("--domain=".length);
    else if (arg.startsWith("--hook="))
      a.hookPrefix = arg.slice("--hook=".length);
    else if (arg.startsWith("--php="))
      a.phpFunctionPrefix = arg.slice("--php=".length);
    else if (arg.startsWith("--ui=")) a.uiFramework = arg.slice("--ui=".length);
    else if (arg.startsWith("--type="))
      a.projectType = arg.slice("--type=".length);
  }
  return { answers: a, target };
}

async function main() {
  const argv = process.argv.slice(2);
  const fromEnv = parseAnswersFromEnv();
  const fromArgs = parseAnswersFromArgs(argv);
  const answers = fromEnv || fromArgs.answers;
  const target = process.env.WPSK_TARGET || fromArgs.target || process.cwd();

  if (!answers || Object.keys(answers).length === 0) {
    process.stdout.write(
      "Usage: node packages/create-wp-project/src/index.js " +
        "[--target=<dir>] [--slug=<s> --scope=<s> --global=<s> --domain=<s> --hook=<s> --php=<s> --ui=preact|react --type=plugin|theme]\n" +
        "   or: WPSK_ANSWERS_JSON=<json> node packages/create-wp-project/src/index.js\n",
    );
    process.exit(2);
  }

  const res = await scaffoldProject(path.resolve(target), answers);
  if (!res.ok) {
    process.stderr.write(
      "Scaffold failed: " + (res.reason || "unknown") + "\n",
    );
    process.exit(1);
  }
  process.stdout.write(
    "Scaffold OK. Wrote: " + (res.written || []).join(", ") + "\n",
  );
}

// CLI detection: if this script was invoked directly (argv[1] is our file
// or our bin), run main(). jest passes the test file as argv[1], so the
// equality check is `endsWith` not `===`.
if (
  (process.argv[1] && process.argv[1].endsWith("create-wp-project")) ||
  (process.argv[1] &&
    process.argv[1].includes("create-wp-project/src/index.js"))
) {
  main().catch((e) => {
    process.stderr.write("Scaffold error: " + (e && e.message) + "\n");
    process.exit(1);
  });
}

/* -------------------------------------------------------------------- */
/* Phase 20 — Engine public API (Appendix C of plan.v3.md)             */
/* -------------------------------------------------------------------- */
//
// Re-export the feature-model, manifest, and preset surface from
// their dedicated modules. The legacy `scaffoldProject` /
// `validateAnswers` / `answersToProjectConfig` exports above
// remain unchanged (BC — pre-Phase 20 callers keep working).
//
// Locked by the engine-api surface area:
//   - getFeatureCatalog      features.js
//   - defaultFeatures        features.js
//   - validateFeatureSet     features.js
//   - getPresets             presets.js
//   - applyPreset            presets.js
//   - buildManifest          manifest.js
//   - readManifest           manifest.js
//   - writeManifest          manifest.js
//   - syncFeaturesToConfig   manifest.js
//   - updateJsonFile         json-utils.js
//
// Phase 22 exports (addFeature, removeFeature) — the installer's
// `wpsk add <feature>` and `wpsk remove <feature>` entry points.
// Both go through the same syncFeaturesToConfig contract as the
// scaffold path, so a consumer that calls them directly sees the
// same on-disk shape scaffoldProject produces.

export {
  getFeatureCatalog,
  defaultFeatures,
  validateFeatureSet,
  buildManifest,
  readManifest,
  writeManifest,
  syncFeaturesToConfig,
  updateJsonFile,
  getPresets,
  applyPreset,
  addFeature,
  removeFeature,
  // Phase 24.1–24.6 — migrations registry, selector, runner.
  getMigrations,
  selectMigrations,
  runMigrations,
  compareSemver,
  // Phase 24.7–24.10 — plan, doctor, dep registry.
  planUpdate,
  doctorProject,
  getDepVersions,
  // Phase 24.12–24.13 — kit status (CLI wpsk info).
  getKitStatus,
};
