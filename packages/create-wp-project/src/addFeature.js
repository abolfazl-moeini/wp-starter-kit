/**
 * @wpsk/create-wp-project — addFeature().
 *
 * Phase 22.3+. The engine API the installer's `wpsk add <feature>`
 * command calls. Turns a feature ON (or switches its variant) in
 * an EXISTING project, writing only the files the feature's
 * generator OWNS and updating the manifest + project.config.json
 * to reflect the new state.
 *
 * Safety contract (per plan.v3.md §22):
 *
 *  - A generator in additive mode may only create / overwrite
 *    files matched by its own `owns` globs. A write that would
 *    land outside `owns` throws (a hard error), not a silent
 *    touch of user code.
 *  - No partial writes on failure: the merge is computed
 *    in-memory first, the validation runs, and only then are
 *    the writes issued. If validation fails, NOTHING is written.
 *  - The manifest + project.config.json are the source of
 *    truth for "is this feature on?" — both are updated after
 *    the generator runs, via the existing `writeManifest` +
 *    `syncFeaturesToConfig` helpers.
 *
 * The `(id, variant)` lookup walks the full catalog
 * (`listGenerators()`) and matches by either:
 *  - `feature: id && variant: variant`  (e.g. js:typescript)
 *  - `feature: id && !variant`          (toggle, e.g. husky)
 *  - `id === "core"`                    (always-on; refused —
 *                                        addFeature is a no-op for core)
 *  - `id === "js"`                      (special: id and feature
 *                                        have the same name; the
 *                                        js:* descriptors have
 *                                        `feature: "js"` + `variant: "..."`)
 *
 * Returns:
 *   { ok: true,  written: string[], deps, devDeps, manifest }
 *   { ok: false, reason: string,  written: [] }   on validation fail
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import minimatch from "minimatch";

import { listGenerators, findGenerator } from "./generators/index.js";
import { validateFeatureSet } from "./features.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  syncFeaturesToConfig,
  DEFAULT_DIST_MODE,
} from "./manifest.js";

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Read project.config.json and reconstruct a minimal `answers`
 * shape that the generators can consume. The reverse mapping
 * uses the keys `answersToProjectConfig` writes (see
 * src/index.js) so the round-trip is symmetric.
 *
 * @param {string} dir
 * @returns {Object}  { cfg, raw } — cfg is the v2-shape object
 *                    (the same one `answersToProjectConfig` returns);
 *                    raw is the full project.config.json (with `features`).
 */
async function readProjectConfigForAdd(dir) {
  const file = path.join(dir, "project.config.json");
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `addFeature: project.config.json not found at ${file} — ` +
          "is this a wp-starter-kit project?",
      );
    }
    throw new Error(
      `addFeature: failed to read project.config.json at ${file}: ${error.message}`,
    );
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `addFeature: malformed JSON in project.config.json at ${file}: ${error.message}`,
    );
  }
  return { cfg, raw };
}

/**
 * Convert a v2-shape project.config.json back into a minimal
 * `answers` object the generators can render. The mapping is
 * the inverse of `answersToProjectConfig` (src/index.js). The
 * full v2 fields ARE preserved in `cfg` (so generators that
 * read `ctx.cfg` keep working), and a small `answers` overlay
 * is what `ctx.answers` carries.
 *
 * @param {Object} cfg
 * @returns {Object}
 */
function projectConfigToAnswers(cfg) {
  return {
    slug: cfg.slug,
    npmScope:
      typeof cfg.npmScope === "string" && cfg.npmScope.startsWith("@")
        ? cfg.npmScope.slice(1)
        : cfg.npmScope,
    globalName: cfg.globalName,
    localizeVar: cfg.localizeVar,
    textDomain: cfg.textDomain,
    hookPrefix: cfg.hookPrefix,
    depsBundle: cfg.depsBundle,
    phpFunctionPrefix: cfg.phpFunctionPrefix,
    uiFramework: cfg.uiFramework,
    projectType: cfg.projectType,
    vendor: cfg.vendor,
    vendorPrefix: cfg.vendorPrefix,
    vendorPrefixUpper:
      cfg.vendorPrefix && cfg.vendorPrefix.toUpperCase
        ? cfg.vendorPrefix.toUpperCase()
        : undefined,
    restNamespace: cfg.restNamespace,
    phpMinVersion: cfg.phpMinVersion,
    phpSourceVersion: cfg.phpSourceVersion,
    batchEndpoint: cfg.batchEndpoint,
  };
}

/**
 * Look up the generator descriptor for a (feature, variant) pair.
 * Matches:
 *   - `feature: id && variant: variant`  (e.g. js:typescript, css:sass)
 *   - `feature: id && !variant`          (toggle, e.g. husky, blocks)
 *
 * Returns `null` if no descriptor matches. The match is
 * descriptor-stable: when multiple variants exist for a feature
 * (e.g. js has typescript/pure/flow), only the descriptor with
 * `variant: variant` matches.
 *
 * @param {string} id
 * @param {string} variant
 * @returns {Object|null}
 */
function findGeneratorForVariant(id, variant) {
  // Fast path: `findGenerator` is the id-only lookup. We need
  // a (feature, variant) match.
  for (const g of listGenerators()) {
    if (g.feature === id) {
      if (g.variant) {
        if (g.variant === variant) return g;
      } else {
        // Toggle — `variant` is the new state ("on"/"off"/"phpunit"/...)
        if (g.id === id) return g;
      }
    }
  }
  // Also try the id-only path (covers cases where the descriptor
  // id equals the feature id, e.g. "css" → css generator).
  const byId = findGenerator(id);
  if (byId && byId.feature === id) return byId;
  return null;
}

/**
 * Filter a generator's `files` output to only those matched by
 * the generator's `owns` globs. A file outside `owns` is a
 * hard error — the generator is misbehaving and the engine
 * refuses to silently touch user code (per plan.v3.md §22
 * safety rule).
 *
 * @param {string} id           descriptor id (for error messages)
 * @param {Object} contribution from g.run(ctx)
 * @param {string[]} owns        the generator's owns[]
 * @returns {Record<string,string>}
 */
function filterToOwned(id, contribution, owns) {
  if (!contribution || !contribution.files) return {};
  const out = {};
  for (const [filePath, content] of Object.entries(contribution.files)) {
    let matched = false;
    for (const glob of owns) {
      if (minimatch(filePath, glob, { dot: true })) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      throw new Error(
        `addFeature: generator "${id}" tried to write "${filePath}" ` +
          `which is outside its owns[] list. Refusing to touch user code.`,
      );
    }
    out[filePath] = content;
  }
  return out;
}

/* -------------------------------------------------------------------- */
/* addFeature                                                            */
/* -------------------------------------------------------------------- */

/**
 * Turn a feature ON (or switch its variant) in an existing
 * wp-starter-kit project.
 *
 * Steps (all in-memory first, then writes — no partial writes on
 * failure):
 *
 *  1. Read the manifest (error if missing — the project is not
 *     a wp-starter-kit project).
 *  2. Read project.config.json + reconstruct `answers`.
 *  3. Compute the new feature set: `{...current, [id]: variant}`.
 *  4. `validateFeatureSet` the merged set — a violation returns
 *     `{ok:false, reason}` and writes nothing.
 *  5. Find the generator for `(id, variant)` via the catalog.
 *     If not found (unknown id), `{ok:false, reason}` and no writes.
 *     If `id === "core"`, `{ok:false, reason}` — core is always-on
 *     and cannot be added (it cannot be removed either; that's
 *     `removeFeature`).
 *  6. Run the generator with a context built from the existing
 *     answers/cfg + the merged feature set. The output is
 *     filtered to only the generator's `owns` files; a leak
 *     throws.
 *  7. Write each owned file to disk.
 *  8. Update wpsk-kit.json (via `writeManifest` + `buildManifest`).
 *  9. Update project.config.json's `features` key (via
 *     `syncFeaturesToConfig`).
 *
 * @param {string} dir
 * @param {string} id           feature id (e.g. "husky", "js", "exampleFeature")
 * @param {string} variant      the new variant (e.g. "on", "typescript", "vitest")
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false]  reserved for parity with
 *                                      scaffoldProject; currently
 *                                      addFeature does not need
 *                                      force (it only writes files
 *                                      the generator owns)
 * @returns {Promise<{
 *   ok: boolean,
 *   written?: string[],
 *   deps?: Record<string,string>,
 *   devDeps?: Record<string,string>,
 *   reason?: string,
 *   noop?: boolean,
 *   manifest?: Object,
 * }>}
 */
export async function addFeature(dir, id, variant, opts = {}) {
  if (!dir || typeof dir !== "string") {
    throw new Error("addFeature: dir is required (string)");
  }
  if (!id || typeof id !== "string") {
    throw new Error("addFeature: id is required (string)");
  }
  if (!variant || typeof variant !== "string") {
    throw new Error("addFeature: variant is required (string)");
  }

  // 1. Read the manifest. A missing manifest is a hard error —
  //    the caller is asking us to mutate a project that does not
  //    exist (or was never a wp-starter-kit project).
  const manifest = readManifest(dir);
  if (!manifest) {
    throw new Error(
      `addFeature: no wpsk-kit.json at ${dir} — ` +
        "is this a wp-starter-kit project?",
    );
  }
  const currentFeatures = manifest.features || {};

  // 2. Read project.config.json + reconstruct answers.
  const { cfg } = await readProjectConfigForAdd(dir);
  const answers = projectConfigToAnswers(cfg);

  // 3. Compute the new feature set.
  const newFeatures = { ...currentFeatures, [id]: variant };

  // 4. Validate the merged set BEFORE looking up the generator.
  //    This way a violation (e.g. faultTolerance=on on PHP 7.4)
  //    fails fast without any I/O.
  const v = validateFeatureSet(newFeatures);
  if (!v.ok) {
    const first = Object.entries(v.errors)[0];
    return {
      ok: false,
      reason: `invalid feature set: ${first[0]}=${JSON.stringify(first[1])}`,
      written: [],
    };
  }

  // 5. Find the generator. core is always-on; addFeature for
  //    core is a no-op (caller is misusing the API — core is
  //    owned by the scaffold path, not by addFeature).
  if (id === "core") {
    return {
      ok: false,
      reason: 'addFeature: "core" is always-on and cannot be added separately',
      written: [],
    };
  }
  const gen = findGeneratorForVariant(id, variant);
  if (!gen) {
    return {
      ok: false,
      reason: `addFeature: no generator found for id="${id}" variant="${variant}"`,
      written: [],
    };
  }

  // 6. Run the generator. The context's features are the merged
  //    set (so any per-generator gate that depends on another
  //    feature — e.g. `js !== "none"` for restBatch — sees the
  //    post-add state). The ctx is built from the existing
  //    answers/cfg + the new features; the registry's own
  //    getGenerators() is NOT used here (addFeature drives
  //    exactly one feature at a time).
  const ctx = {
    answers,
    cfg,
    features: newFeatures,
    vars: undefined, // generators fall back to { answers, cfg } if missing
  };
  let contribution;
  try {
    contribution = gen.run(ctx);
  } catch (error) {
    return {
      ok: false,
      reason: `addFeature: generator "${gen.id}" failed: ${error.message}`,
      written: [],
    };
  }

  // 7. Filter to owned files. A leak throws — we do NOT
  //    silently touch user code.
  const filesToWrite = filterToOwned(gen.id, contribution, gen.owns);

  // 8. Idempotency check: if the manifest already records the
  //    feature as on with the same variant, the call is a no-op.
  //    We do NOT byte-compare the files — that's the job of
  //    migrations / `update` (Phase 24). addFeature's contract
  //    is "make the manifest match the requested state"; if the
  //    manifest is already there, nothing to do.
  if (currentFeatures[id] === variant) {
    return {
      ok: true,
      noop: true,
      written: [],
      deps: contribution.deps || {},
      devDeps: contribution.devDeps || {},
      manifest,
    };
  }

  // 9. Write the owned files. Directories are created on demand.
  const written = [];
  for (const [filePath, content] of Object.entries(filesToWrite)) {
    const abs = path.join(dir, filePath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    written.push(filePath);
  }

  // 10. Update the manifest. The manifest's `features` is the
  //     merged set; kitVersion is the existing version (a
  //     manual addFeature does NOT bump kitVersion — that's
  //     migrations' job); distMode is the existing mode.
  const nextManifest = buildManifest({
    kitVersion: manifest.kitVersion,
    features: newFeatures,
    distMode: manifest.distMode || DEFAULT_DIST_MODE,
    generatedAt: new Date().toISOString(),
  });
  await writeManifest(dir, nextManifest);

  // 11. Update project.config.json's `features` key.
  await syncFeaturesToConfig(dir, newFeatures);

  return {
    ok: true,
    written,
    deps: contribution.deps || {},
    devDeps: contribution.devDeps || {},
    manifest: nextManifest,
  };
}
