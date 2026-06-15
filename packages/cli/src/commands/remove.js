/**
 * `wpsk remove <feature>` — remove a feature from an existing project.
 *
 * Phase I4 (plan.installer.md §I4.7 + §I4.8).
 *
 * Pipeline:
 *   1. Validate deps.
 *   2. Refuse to remove the always-on `core` feature. The
 *      engine's removeFeature would also refuse, but the
 *      check is duplicated here so the CLI's contract is
 *      explicit and the user gets a clear, CLI-level error
 *      message (the engine's message is fine, but the CLI
 *      one can include the directory context).
 *   3. Confirmation gate. When `runOptions.yes !== true`, we
 *      call `ui.confirm({message: "remove <feature> from <dir>?"})`.
 *      If the user declines, return `{ok:false, reason:"cancelled"}`
 *      and the engine is NOT called.
 *   4. Call `engine.removeFeature(dir, id, {force: runOptions.force})`.
 *      Engine `{ok:false, reason}` is surfaced as
 *      `{ok:false, reason}`.
 *   5. The function NEVER throws on engine errors.
 *
 * Engine + runners + ui are injectable via the `deps` arg so
 * unit tests can wire fakes.
 */

/* -------------------------------------------------------------------- */
/* runRemove                                                              */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} RemoveInput
 * @property {string} dir
 * @property {string} featureId
 * @property {Object} [runOptions]   { yes, force, verbose, ... }
 */

/**
 * @typedef {Object} RemoveDeps
 * @property {Object} engine          { removeFeature, getFeatureCatalog }
 * @property {Object} [runners]       { npmInstall, composerInstall, gitInit }
 * @property {Object} [ui]            { confirm, log, ... }
 */

/**
 * @param {RemoveInput} input
 * @param {RemoveDeps}  deps
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   removed?: string[],
 * }>}
 */
export async function runRemove(input, deps = {}) {
  const i = input || {};
  const d = deps || {};
  const engine = d.engine;
  const ui = d.ui || {};
  const runOptions = i.runOptions || {};

  // 1. Basic precondition checks.
  if (!i.dir || typeof i.dir !== "string") {
    return { ok: false, reason: "runRemove: dir is required" };
  }
  if (!i.featureId || typeof i.featureId !== "string") {
    return { ok: false, reason: "runRemove: featureId is required" };
  }
  if (!engine || typeof engine.removeFeature !== "function") {
    return {
      ok: false,
      reason: "runRemove: deps.engine.removeFeature is required",
    };
  }

  // 2. Always-on `core` guard. The engine's removeFeature also
  //    refuses core, but doing it at the CLI layer gives a
  //    consistent, dir-aware error message.
  if (i.featureId === "core") {
    return {
      ok: false,
      reason:
        'runRemove: "core" is always-on and cannot be removed from ' + i.dir,
    };
  }

  // 3. Confirmation gate. --yes (or -y) bypasses the prompt.
  //    When the user has NOT confirmed, we return a soft
  //    "cancelled" — the bin layer prints a friendly message
  //    and exits 0 (a cancelled remove is not an error).
  if (runOptions.yes !== true) {
    if (typeof ui.confirm !== "function") {
      // The bin layer is supposed to wire a ui with confirm.
      // Without it we cannot safely bypass; refuse conservatively.
      return {
        ok: false,
        reason:
          "runRemove: confirmation required (pass --yes to skip); " +
          "deps.ui.confirm is missing",
      };
    }
    const ok = await ui.confirm({
      message: "Remove feature '" + i.featureId + "' from " + i.dir + "?",
      initial: false,
    });
    if (ok !== true) {
      return { ok: false, reason: "cancelled" };
    }
  }

  // 4. Engine call.
  let result;
  try {
    result = await engine.removeFeature(i.dir, i.featureId, {
      force: runOptions.force,
    });
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.removeFeature threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }

  if (!result || result.ok !== true) {
    return {
      ok: false,
      reason: (result && result.reason) || "engine.removeFeature failed",
    };
  }

  return {
    ok: true,
    removed: result.removed || [],
  };
}
