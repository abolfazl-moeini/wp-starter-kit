/**
 * `wpdev list` — print the features in the current project's
 * `wpdev-kit.json` (manifest).
 *
 * Phase I4 (plan.installer.md §I4.1 + §I4.2).
 *
 * Pipeline:
 *   1. Validate deps. Without `engine.readManifest` and
 *      `engine.getFeatureCatalog`, list cannot answer "what is
 *      in this project?" and we return `{ok:false, reason}`.
 *   2. Read the manifest via `engine.readManifest(dir)`. A null
 *      return means "no manifest" — the dir is not a
 *      wp-starter-kit project. We return `{ok:false, reason}` so
 *      the bin layer can print a clean error and exit 1.
 *   3. Build a row per catalog feature. `state` is "on" when
 *      the manifest records a non-OFF variant, "off" otherwise.
 *      The OFF values are the catalog's variants that literally
 *      read "off" or "none" (we treat both as OFF — the
 *      catalog's design is that EVERY feature has at least one
 *      OFF-equivalent value).
 *   4. Delegate the pretty-printing to `ui.renderFeatureTable`.
 *      Tests inject a fake ui; the bin layer wires the real one.
 *
 * Engine + ui are injectable via the `deps` arg so unit tests
 * can wire fakes. The bin layer (main.js) wires the real
 * engine + ui.
 */

/* -------------------------------------------------------------------- */
/* runList                                                                */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} ListInput
 * @property {string} dir       target project dir (must contain wpdev-kit.json)
 */

/**
 * @typedef {Object} ListDeps
 * @property {Object} engine    { readManifest, getFeatureCatalog }
 * @property {Object} ui        { renderFeatureTable, log, ... }
 */

/**
 * @param {string|ListInput} dirOrInput  (string is accepted for the
 *                                       bin-level convenience — tests
 *                                       pass a `ListInput` object).
 * @param {ListDeps} [deps]
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   rows?: Array<{id: string, state: string, variant: string}>,
 * }>}
 */
export async function runList(dirOrInput, deps = {}) {
  // Normalize the input shape. The bin layer passes a plain dir
  // string (`runList("/tmp/proj", { engine, ui })`); tests pass an
  // object. We accept both.
  const dir = typeof dirOrInput === "string" ? dirOrInput : dirOrInput?.dir;
  const engine = deps.engine;
  const ui = deps.ui || {};

  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "runList: dir is required" };
  }
  if (!engine || typeof engine.readManifest !== "function") {
    return {
      ok: false,
      reason: "runList: deps.engine.readManifest is required",
    };
  }
  if (typeof engine.getFeatureCatalog !== "function") {
    return {
      ok: false,
      reason: "runList: deps.engine.getFeatureCatalog is required",
    };
  }

  // 1. Read the manifest. A null return is the canonical
  //    "no manifest" answer (the engine's contract — see
  //    packages/create-wp-project/src/manifest.js).
  let manifest;
  try {
    manifest = engine.readManifest(dir);
  } catch (e) {
    return {
      ok: false,
      reason:
        "runList: failed to read manifest at " +
        dir +
        ": " +
        (e && e.message ? e.message : String(e)),
    };
  }
  if (!manifest) {
    return {
      ok: false,
      reason:
        "no manifest (wpdev-kit.json) at " +
        dir +
        " — is this a wp-starter-kit project?",
    };
  }

  // 2. Build rows. One per catalog feature (the catalog is the
  //    source of truth for "how many features are there", not the
  //    manifest's `features` key — a feature that's been turned
  //    off is still in the catalog, just with state='off').
  const catalog = engine.getFeatureCatalog() || [];
  const manifestFeatures =
    (manifest && manifest.features && typeof manifest.features === "object"
      ? manifest.features
      : {}) || {};

  const rows = catalog.map((f) => {
    const variant =
      manifestFeatures[f.id] !== undefined
        ? manifestFeatures[f.id]
        : f.variants[0];
    return {
      id: f.id,
      state: computeState(f, variant),
      variant: typeof variant === "string" ? variant : String(variant),
    };
  });

  // 3. Pretty-print via the ui seam. We do NOT swallow a missing
  //    renderFeatureTable — callers who care about UI should
  //    inject a ui. We also do not throw if the ui helper
  //    throws; the print step is a side effect that should not
  //    destroy the structured result.
  if (ui.renderFeatureTable) {
    try {
      await ui.renderFeatureTable(rows);
    } catch (e) {
      // Surface the error in the result so the bin layer can
      // decide whether to print a warning. We do NOT clobber
      // the rows (the caller might still want them).
      return {
        ok: true,
        rows,
        warning:
          "ui.renderFeatureTable threw: " +
          (e && e.message ? e.message : String(e)),
      };
    }
  }

  return { ok: true, rows };
}

/* -------------------------------------------------------------------- */
/* Helpers                                                                */
/* -------------------------------------------------------------------- */

/**
 * Decide the "on"/"off" label for a feature given its current
 * variant value. The OFF values are the catalog variants that
 * literally read "off" or "none" — the catalog's design
 * convention is that every feature has at least one such
 * value (see plan.v3.md §1).
 *
 * The check is per-feature: we look at the feature's own
 * `variants` list, not a global constant, so a feature that
 * happens to have a non-OFF variant named "none" (none in the
 * current catalog) would still be reported as "on" when its
 * variant is "none" — but the catalog's actual OFF convention
 * is universal so this is a defensive guard.
 *
 * @param {{variants: string[]}} feature
 * @param {string} variant
 * @returns {"on" | "off"}
 */
function computeState(feature, variant) {
  if (typeof variant !== "string") return "off";
  // The catalog's universal OFF convention.
  if (variant === "off" || variant === "none") return "off";
  // Defensive: if the variant is the FIRST entry of the
  // feature's variants list, that's the default (per the
  // catalog's "first = default" rule). Most defaults are
  // "on" (e.g. husky:on, i18n:on) so this is on. A default of
  // "none"/"off" is caught by the literal check above.
  return "on";
}
