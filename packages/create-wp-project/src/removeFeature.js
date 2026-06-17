/**
 * @wpsk/create-wp-project — removeFeature().
 *
 * Phase 22.9+. The engine API the installer's `wpsk remove <feature>`
 * command calls. The mirror of addFeature(): turn a feature OFF
 * in an EXISTING project, deleting only the files the feature's
 * generator OWNS and updating the manifest + project.config.json
 * to reflect the new state.
 *
 * Safety contract (per plan.v3.md §22):
 *
 *  - The manifest is the source of truth for "is this feature on?".
 *    removeFeature reads it to discover the current variant and
 *    to refuse removal of always-on `core`.
 *  - No partial writes on failure: the new feature set is computed
 *    in-memory first, validation runs, and only then are deletes
 *    issued and the manifest + project.config.json updated. A
 *    failure leaves the on-disk state untouched.
 *  - A generator's `owns` globs are the only paths removeFeature
 *    deletes. A file matched by ANY other still-ON feature's owns
 *    is preserved (shared-owned protection — same rule addFeature's
 *    variant switch applies, in the delete direction). Files
 *    OUTSIDE the feature's owns are never touched.
 *  - `core` cannot be removed — it's always-on. Trying to remove
 *    it returns `{ok:false, reason}`.
 *  - An unknown feature id returns `{ok:false, reason}` — the
 *    catalog is the source of truth.
 *  - A missing manifest returns `{ok:false, reason}` — the caller
 *    is asking us to mutate a project that doesn't exist.
 *
 * For toggle features (husky, exampleFeature, etc.) the new
 * variant is the OFF value from the catalog (the variant that
 * equals `"off"`, or the OFF-equivalent — every toggle in the
 * current catalog uses the literal `"off"`). For variant features
 * (js, css, phpTest, …) removeFeature sets the variant to the
 * OFF/none value (e.g. `js: "none"`, `css: "none"`); the owned-
 * file semantics are the same.
 *
 * Returns:
 *   { ok: true,  written: string[]|false, removed: string[], manifest }
 *   { ok: false, reason: string,  removed: [] }    on refuse
 *
 * `written` is `false` when glue is unchanged, or a list of
 * core-owned glue paths refreshed by `refreshGlue` (and
 * `-"path"` entries when conditional glue was removed).
 * removeFeature never emits feature-owned files. It's part of the return shape so the caller's
 * "did anything change?" check is uniform across addFeature and
 * removeFeature.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import minimatch from "minimatch";

import { listGenerators } from "./generators/index.js";
import { getFeatureCatalog, validateFeatureSet } from "./features.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  syncFeaturesToConfig,
  DEFAULT_DIST_MODE,
} from "./manifest.js";
import { refreshGlue } from "./refresh-glue.js";

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Find the catalog descriptor for a feature by id. Returns `null`
 * when the id is not in the catalog (the same source-of-truth
 * check validateFeatureSet uses, but resolved to the descriptor
 * so we can read its `variants` list).
 *
 * @param {string} id
 * @returns {Object|null}
 */
function findCatalogEntry(id) {
  for (const f of getFeatureCatalog()) {
    if (f.id === id) return f;
  }
  return null;
}

/**
 * Pick the OFF value for a feature. The convention is:
 *  - If the catalog has a variant literally named `"off"`, that
 *    is the OFF value (matches husky, exampleFeature, i18n,
 *    vendorScoping, faultTolerance, restBatch, blocks).
 *  - Otherwise, fall back to the first variant whose name is
 *    `"none"` (matches js, jsLib, jsTest, css, phpFramework,
 *    phpTest). For features that have neither `"off"` nor
 *    `"none"` in their variants (e.g. `license`: only `gpl2`,
 *    `gpl3`, `mit`; `phpMinVersion`, `wpMinVersion` — pure
 *    config), removeFeature's caller is misusing the API
 *    (you can't "turn off" a license) and we throw a clear
 *    error.
 *
 * Centralizing the OFF pick here means addFeature's
 * "this feature's OFF is X" answer and removeFeature's
 * "set the variant to the OFF value" answer are the same
 * code path — there's no way for them to drift.
 *
 * @param {string} id
 * @returns {string}
 */
function pickOffVariant(id) {
  const entry = findCatalogEntry(id);
  if (!entry) {
    throw new Error(
      `removeFeature: "${id}" is not a known feature id (no catalog entry)`,
    );
  }
  if (entry.variants.includes("off")) return "off";
  if (entry.variants.includes("none")) return "none";
  throw new Error(
    `removeFeature: feature "${id}" has no OFF/none variant ` +
      `(allowed: ${entry.variants.join(", ")}) — cannot be turned off`,
  );
}

/**
 * Find the generator descriptor(s) that own a given feature.
 * For toggle features (e.g. husky) there is exactly one
 * descriptor with `feature: id`. For variant features (e.g.
 * js, css) there are MULTIPLE descriptors (js:typescript,
 * js:pure, js:flow); in that case we only need the descriptor
 * that matches the CURRENT variant (to know which owns[] list
 * to delete from), so we filter by `variant`.
 *
 * Special case: `id === "core"` matches the core descriptor
 * whose `feature` field is `null` (it's the always-on generator
 * and doesn't gate on a feature id). The core descriptor's
 * owns list MUST be protected by the shared-owned walker.
 *
 * If `currentVariant` is omitted, ALL descriptors for the
 * feature are returned (used by the shared-owned-protection
 * walker that needs to consider every variant's owns lists).
 *
 * @param {string} id
 * @param {string} [currentVariant]
 * @returns {Object[]}  empty array when no generator claims the feature
 */
function findFeatureGenerators(id, currentVariant) {
  const out = [];
  for (const g of listGenerators()) {
    if (id === "core") {
      if (g.id !== "core") continue;
    } else {
      if (g.feature !== id) continue;
    }
    if (currentVariant !== undefined) {
      // For variant features (e.g. js) descriptors have an explicit
      // `variant` field; the filter is `g.variant === currentVariant`.
      // For toggle features (e.g. husky) descriptors have NO
      // `variant` field — they emit when the feature is on regardless
      // of the variant value. A descriptor with `g.variant ===
      // undefined` matches any non-variant currentVariant
      // (e.g. "on", "off", "phpunit"). This dual-shape handling
      // mirrors what addFeature's findGeneratorForVariant does.
      if (g.variant !== undefined && g.variant !== currentVariant) continue;
    }
    out.push(g);
  }
  return out;
}

/**
 * Collect the union of `owns` globs across every still-ON
 * feature's generator EXCEPT the one being removed. The walker
 * uses this union as a "do-not-delete" filter — a file matched
 * by the union is owned by something else, so removing it
 * would clobber another feature's territory.
 *
 * Variant features (js, css) have multiple descriptors per
 * feature id; we include all of them so a js:typescript project
 * still has the js:typescript owns list protected when removing
 * an unrelated feature (e.g. exampleFeature).
 *
 * @param {Object} allFeatures  the project's current feature set
 * @param {string} skipId       the feature id being removed
 *                              (its owns are still included —
 *                              we're computing "what stays")
 * @returns {string[]}
 */
function collectOtherOwns(allFeatures, skipId) {
  const out = [];
  for (const f of getFeatureCatalog()) {
    if (f.id === skipId) continue;
    let variant;
    if (f.id === "core") {
      // core is always on — there's no entry in allFeatures for
      // it (the catalog has it but the manifest doesn't carry a
      // features.core field), so we synthesize the "current variant"
      // as undefined and let findFeatureGenerators return the
      // core descriptor by id.
      variant = undefined;
    } else {
      variant = allFeatures[f.id];
      if (variant === undefined) continue;
    }
    // Include every still-relevant feature's owns — even OFF
    // features' owns — so the shared-owned protection is
    // conservative. An OFF feature's owned file isn't on disk
    // to begin with, so the protection is theoretical, but it
    // costs nothing and makes the safety story easier to
    // reason about ("never clobber another feature's owns,
    // period").
    const gens = findFeatureGenerators(f.id, variant);
    for (const g of gens) {
      if (g.owns) out.push(...g.owns);
    }
  }
  return out;
}

/**
 * Check whether a path is matched by ANY glob in the list.
 *
 * @param {string} filePath
 * @param {string[]} globs
 * @returns {boolean}
 */
function isMatchedByAny(filePath, globs) {
  for (const glob of globs) {
    if (minimatch(filePath, glob, { dot: true })) return true;
  }
  return false;
}

/**
 * Recursively walk a directory and yield every regular file's
 * path relative to `root`. Symlinks and special files are
 * skipped. Skips node_modules / vendor / dist / build / .git —
 * the engine never touches those even if a generator's owns
 * somehow matched them. Mirrors addFeature's walkFiles.
 *
 * @param {string} root   the project root
 * @param {string} [dir]  internal — current dir being walked
 * @param {number} [depth=0]
 * @returns {AsyncGenerator<{rel: string, abs: string}>}
 */
async function* walkFiles(root, dir = root, depth = 0) {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name === "node_modules" ||
        ent.name === "vendor" ||
        ent.name === "dist" ||
        ent.name === "build" ||
        ent.name === ".git"
      ) {
        continue;
      }
      yield* walkFiles(root, abs, depth + 1);
    } else if (ent.isFile()) {
      const rel = path.relative(root, abs);
      const relNorm = rel.split(path.sep).join("/");
      yield { rel: relNorm, abs };
    }
  }
}

/* -------------------------------------------------------------------- */
/* removeFeature                                                         */
/* -------------------------------------------------------------------- */

/**
 * Turn a feature OFF in an existing wp-starter-kit project.
 *
 * Steps (all in-memory first, then writes — no partial writes on
 * failure):
 *
 *  1. Read the manifest. A missing manifest is `{ok:false,
 *     reason}` — the caller is asking us to mutate a project
 *     that does not exist.
 *  2. If `id === "core"`, refuse (`{ok:false, reason}`).
 *  3. If `id` is not in the catalog, refuse (`{ok:false, reason}`).
 *  4. Compute the new feature set: `{...current, [id]: OFF}`.
 *     The OFF value is the catalog's `"off"` variant, falling
 *     back to `"none"` for variant features.
 *  5. `validateFeatureSet` the merged set — a violation
 *     returns `{ok:false, reason}` and writes nothing.
 *  6. Find the generator descriptor(s) for the CURRENT variant
 *     of the feature (so we know which `owns` list to delete
 *     from). For variant features (e.g. js has typescript/pure/
 *     flow) only the currently-active variant's owns are
 *     considered for deletion.
 *  7. Walk the project tree; for every file matched by the
 *     removed feature's owns that is NOT matched by any other
 *     still-ON feature's owns, delete it.
 *  8. Update wpdev-kit.json (via `writeManifest` +
 *     `buildManifest`).
 *  9. Update project.config.json's `features` key (via
 *     `syncFeaturesToConfig`).
 *
 * @param {string} dir
 * @param {string} id           feature id (e.g. "husky", "js", "exampleFeature")
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false]  reserved for parity with
 *                                      addFeature/scaffoldProject;
 *                                      currently unused.
 * @returns {Promise<{
 *   ok: boolean,
 *   written?: string[]|false,
 *   removed?: string[],
 *   reason?: string,
 *   manifest?: Object,
 * }>}
 */
export async function removeFeature(dir, id, _opts = {}) {
  if (!dir || typeof dir !== "string") {
    throw new Error("removeFeature: dir is required (string)");
  }
  if (!id || typeof id !== "string") {
    throw new Error("removeFeature: id is required (string)");
  }

  // 1. Read the manifest. Missing manifest is a refuse, not a
  //    throw — addFeature throws on a missing manifest because
  //    the caller is asserting "this is a project, add a feature";
  //    removeFeature is a softer "if this is a project, turn X
  //    off" — returning {ok:false, reason} is more useful to the
  //    CLI's "report back" path.
  const manifest = readManifest(dir);
  if (!manifest) {
    return {
      ok: false,
      reason:
        `removeFeature: no wpdev-kit.json at ${dir} — ` +
        "is this a wp-starter-kit project?",
      removed: [],
    };
  }
  const currentFeatures = manifest.features || {};

  // 2. core is always-on; refuse. Same message shape as
  //    addFeature's "cannot add core" refusal so the CLI can
  //    format both uniformly.
  if (id === "core") {
    return {
      ok: false,
      reason: 'removeFeature: "core" is always-on and cannot be removed',
      removed: [],
    };
  }

  // 3. Unknown id — refuse. The catalog is the source of truth.
  const catalogEntry = findCatalogEntry(id);
  if (!catalogEntry) {
    return {
      ok: false,
      reason: `removeFeature: "${id}" is not a known feature id`,
      removed: [],
    };
  }

  // 4. Compute the new feature set with the OFF value.
  let offVariant;
  try {
    offVariant = pickOffVariant(id);
  } catch (error) {
    return { ok: false, reason: error.message, removed: [] };
  }
  const newFeatures = { ...currentFeatures, [id]: offVariant };

  // 5. Validate the merged set BEFORE looking at the project
  //    tree. Turning a feature off should never violate a
  //    forward rule (off/none is always permissive), but a
  //    future rule that depends on a feature being off (e.g.
  //    "feature X requires Y=off") would surface here.
  const v = validateFeatureSet(newFeatures);
  if (!v.ok) {
    const first = Object.entries(v.errors)[0];
    return {
      ok: false,
      reason: `invalid feature set: ${first[0]}=${JSON.stringify(first[1])}`,
      removed: [],
    };
  }

  // 6. Find the generator(s) that own the feature in its
  //    CURRENT variant. For a toggle feature (husky) there's
  //    exactly one. For a variant feature (js has typescript/
  //    pure/flow) there's exactly one matching the current
  //    variant. For a never-toggled feature that has no
  //    generator (theoretical — every catalog id maps to at
  //    least one), `gens` is empty and the walk below
  //    deletes nothing.
  const currentVariant = currentFeatures[id];
  const gens = findFeatureGenerators(id, currentVariant);
  const ownGlobs = [];
  for (const g of gens) {
    if (g.owns) ownGlobs.push(...g.owns);
  }

  // 7. Walk the project tree and delete every file matched by
  //    the removed feature's owns AND not matched by any other
  //    still-ON feature's owns. The latter filter is the
  //    "shared-owned protection" — if a future refactor makes
  //    husky and exampleFeature both claim a file, removing
  //    one does not clobber the other.
  const otherOwns = collectOtherOwns(currentFeatures, id);
  const removedAbs = [];
  const removedRel = [];
  if (ownGlobs.length > 0) {
    for await (const { rel, abs } of walkFiles(dir)) {
      if (isMatchedByAny(rel, ownGlobs) && !isMatchedByAny(rel, otherOwns)) {
        try {
          await fs.unlink(abs);
          removedAbs.push(abs);
          removedRel.push(rel);
        } catch (error) {
          // A file that disappeared between the walk and the
          // unlink is not a failure (someone else cleaned it
          // up). Re-throw on real I/O errors.
          if (error.code !== "ENOENT") throw error;
        }
      }
    }
  }

  // 8. Update the manifest. The manifest's `features` is the
  //    merged set; kitVersion is the existing version (a
  //    removeFeature does NOT bump kitVersion — that's
  //    migrations' job); distMode is the existing mode.
  const nextManifest = buildManifest({
    kitVersion: manifest.kitVersion,
    features: newFeatures,
    distMode: manifest.distMode || DEFAULT_DIST_MODE,
    generatedAt: new Date().toISOString(),
  });
  await writeManifest(dir, nextManifest);

  // 9. Update project.config.json's `features` key.
  await syncFeaturesToConfig(dir, newFeatures);

  const glueWritten = await refreshGlue(dir, newFeatures);

  return {
    ok: true,
    written: glueWritten.length > 0 ? glueWritten : false,
    removed: removedRel,
    manifest: nextManifest,
  };
}
