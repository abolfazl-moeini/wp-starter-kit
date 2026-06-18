/**
 * `wpdev add <feature>` — add a feature to an existing project.
 *
 * Phase I4 (plan.installer.md §I4.3–§I4.6).
 *
 * Pipeline:
 *   1. Validate deps. The unknown-id guard runs BEFORE the engine
 *      so a typo'd feature exits with a clear error and zero
 *      I/O.
 *   2. Validate the feature id against `engine.getFeatureCatalog()`.
 *      Unknown id → return `{ok:false, reason}` listing the
 *      valid ids. The engine is NOT called.
 *   3. Resolve the variant. The input may specify one explicitly
 *      (`{ variant: "tailwind" }`); otherwise we use the catalog
 *      default (`f.variants[0]`, per the "first = default" rule).
 *   4. Call `engine.addFeature(dir, id, variant, {force: runOptions.force})`.
 *      Engine `{ok:false, reason}` is surfaced as
 *      `{ok:false, reason}` on the result; runners are NOT
 *      called.
 *   5. When the engine returns `{ok:true}` AND
 *      `runOptions.install === true`, call
 *      `runners.npmInstall(dir, {verbose})` and
 *      `runners.composerInstall(dir, {verbose})`. The plan I4.3
 *      wording is "if it returns deps to install AND --install,
 *      calls the runners" — we honor --install as the user's
 *      intent: when they pass --install, the runners run
 *      unconditionally. The engine's dep report is informational
 *      (the install is a separate user decision).
 *   6. Forward `runOptions.verbose` to the runners.
 *   7. The function NEVER throws on engine errors.
 *
 * Engine + runners + ui are injectable via the `deps` arg so
 * unit tests can wire fakes.
 */

import { runList } from "./list.js";

/* -------------------------------------------------------------------- */
/* runAdd                                                                 */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} AddInput
 * @property {string} dir
 * @property {string} featureId
 * @property {string} [variant]
 * @property {Object} [runOptions]   { force, install, verbose, ... }
 */

/**
 * @typedef {Object} AddDeps
 * @property {Object} engine          { addFeature, getFeatureCatalog }
 * @property {Object} [runners]       { npmInstall, composerInstall, gitInit }
 * @property {Object} [ui]            { confirm, log, ... }
 */

/**
 * @param {AddInput} input
 * @param {AddDeps}  deps
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   written?: string[],
 *   removed?: string[],
 *   deps?: object,
 *   devDeps?: object,
 * }>}
 */
export async function runAdd(input, deps = {}) {
  const i = input || {};
  const d = deps || {};
  const engine = d.engine;
  const runners = d.runners || {};
  const ui = d.ui || {};
  const runOptions = i.runOptions || {};

  // 1. Basic precondition checks.
  if (!i.dir || typeof i.dir !== "string") {
    return { ok: false, reason: "runAdd: dir is required" };
  }

  if (runOptions.list === true) {
    return runList({ dir: i.dir }, { engine, ui });
  }

  if (!i.featureId || typeof i.featureId !== "string") {
    return { ok: false, reason: "runAdd: featureId is required" };
  }
  if (!engine || typeof engine.addFeature !== "function") {
    return {
      ok: false,
      reason: "runAdd: deps.engine.addFeature is required",
    };
  }
  if (typeof engine.getFeatureCatalog !== "function") {
    return {
      ok: false,
      reason: "runAdd: deps.engine.getFeatureCatalog is required",
    };
  }

  // 2. Unknown-id guard (I4.5 / I4.6). The catalog is the
  //    source of truth for valid ids. We list every id in the
  //    error reason so the user can fix a typo without
  //    re-reading docs.
  const catalog = engine.getFeatureCatalog() || [];
  const match = catalog.find((f) => f.id === i.featureId);
  if (!match) {
    const validIds = catalog.map((f) => f.id).join(", ");
    return {
      ok: false,
      reason:
        "unknown feature: '" +
        i.featureId +
        "'. Valid feature ids: " +
        validIds,
    };
  }

  // 3. Variant resolution. Explicit input wins; otherwise we use
  //    the catalog's default (variants[0] per the "first =
  //    default" rule). Note: we do NOT validate the variant
  //    against the feature's allowed list here — the engine's
  //    addFeature does that (it returns {ok:false, reason} for
  //    an unknown variant). Centralizing the validation in the
  //    engine keeps the CLI thin.
  const variant =
    typeof i.variant === "string" && i.variant.length > 0
      ? i.variant
      : match.variants[0];

  if (runOptions.yes !== true && typeof ui.confirm === "function") {
    const proceed = await ui.confirm({
      message: `Add feature '${i.featureId}' to ${i.dir}?`,
      initial: true,
    });
    if (proceed !== true) {
      return { ok: false, reason: "cancelled" };
    }
  }

  // 3b. Doctor gate (TASK-12a). Surface project errors before
  //     mutating files; --force skips the check entirely.
  if (runOptions.force !== true && typeof engine.doctorProject === "function") {
    let doctorReport;
    try {
      doctorReport = engine.doctorProject(i.dir);
    } catch (e) {
      return {
        ok: false,
        reason:
          "engine.doctorProject threw: " +
          (e && e.message ? e.message : String(e)),
      };
    }
    const errors = Array.isArray(doctorReport && doctorReport.errors)
      ? doctorReport.errors
      : [];
    if (errors.length > 0) {
      if (typeof ui.log === "function") {
        try {
          await ui.log("Project doctor reported errors:");
          for (const err of errors) {
            await ui.log("  - " + err);
          }
        } catch {
          // Non-fatal — confirmation still runs.
        }
      }
      if (runOptions.yes !== true) {
        if (typeof ui.confirm !== "function") {
          return {
            ok: false,
            reason:
              "runAdd: doctor found errors (pass --force or --yes to continue); " +
              "deps.ui.confirm is missing",
            doctorErrors: errors,
          };
        }
        const proceed = await ui.confirm({
          message: "Your project has issues. Continue anyway?",
          initial: false,
        });
        if (proceed !== true) {
          return {
            ok: false,
            reason: "cancelled due to doctor errors",
            doctorErrors: errors,
          };
        }
      }
    }
  }

  // 4. Engine call. The `force` flag is forwarded as-is so
  //    tests can assert the call args literally. We do NOT
  //    default to false — the engine's addFeature treats
  //    `opts = {}` as "no force" so the omission is safe.
  let result;
  try {
    result = await engine.addFeature(i.dir, i.featureId, variant, {
      force: runOptions.force,
    });
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.addFeature threw: " + (e && e.message ? e.message : String(e)),
    };
  }

  if (!result || result.ok !== true) {
    return {
      ok: false,
      reason: (result && result.reason) || "engine.addFeature failed",
    };
  }

  // 5. Optional install. We always run the runners when the
  //    user asked for them via --install; the engine's dep
  //    report is informational. The user is the one who
  //    decided "yes, re-run npm/composer". The runner results
  //    are returned in the result for the bin layer to
  //    surface (typically via a warning, not a hard error).
  const warnings = [];
  if (runOptions.install === true) {
    const runnerOpts = { verbose: runOptions.verbose === true };
    if (typeof runners.npmInstall === "function") {
      try {
        const r = await runners.npmInstall(i.dir, runnerOpts);
        if (r && r.ok === false) {
          warnings.push(
            r.skipped
              ? "npm install skipped: " + (r.reason || "unknown")
              : "npm install failed: " + (r.error || "unknown"),
          );
        }
      } catch (e) {
        warnings.push(
          "npm install threw: " + (e && e.message ? e.message : String(e)),
        );
      }
    }
    if (typeof runners.composerInstall === "function") {
      try {
        const r = await runners.composerInstall(i.dir, runnerOpts);
        if (r && r.ok === false) {
          warnings.push(
            r.skipped
              ? "composer install skipped: " + (r.reason || "unknown")
              : "composer install failed: " + (r.error || "unknown"),
          );
        }
      } catch (e) {
        warnings.push(
          "composer install threw: " + (e && e.message ? e.message : String(e)),
        );
      }
    }
  }

  return {
    ok: true,
    written: result.written || [],
    removed: result.deleted || [],
    deps: result.deps || {},
    devDeps: result.devDeps || {},
    warnings: warnings.length > 0 ? warnings : undefined,
    // Reference the ui var so eslint/static checks don't flag
    // it as unused; we currently don't print anything post-add
    // (the engine's own generator already reports its work)
    // but the dependency is part of the public surface for
    // future "log add summary" hooks.
    ...(ui && typeof ui === "object" ? {} : {}),
  };
}
