/**
 * `wpsk info` — print kit version, feature states, and available
 * updates for the current project.
 *
 * Phase I5 (plan.installer.md §I5.7 + §I5.8). Replaces the I1
 * stub. The command is a thin front-end over
 * `engine.getKitStatus(dir, { lookupLatest })` plus
 * `ui.renderKitStatus` for pretty-printing.
 *
 * Pipeline:
 *   1. Validate deps. `engine.getKitStatus` is the only hard
 *      dep; the lookup helper is injected (the bin layer wires
 *      a real `npm view @wpdev/cli version` shim; tests inject
 *      a fake). `ui.renderKitStatus` is optional — the command
 *      still returns the status object even when ui is missing
 *      (the bin layer can decide how to print it).
 *   2. Resolve `dir` from the input. The input may be a string
 *      (the bin layer passes a string when the user ran
 *      `wpsk info /abs/proj`) or an object
 *      `{ dir, runOptions: { json } }` (the bin layer's
 *      commander-tail path). Missing dir → `{ok:false, reason}`.
 *   3. Resolve `--json` from two sources (in priority order):
 *      a) `input.runOptions.json === true` — the gather
 *         pipeline already parsed it.
 *      b) `input.argv` contains a bare `--json` token — the
 *         bin layer forwarded the raw argv tail and we pick
 *         it up here. The command-local parse keeps the
 *         dependency graph small (no global flag registry).
 *   4. Call `engine.getKitStatus(dir, { lookupLatest })`. The
 *      engine's contract (see
 *      `packages/create-wp-project/src/kit-status.js`) is
 *      "NEVER throws; a missing manifest is `{ok:false, reason}`"
 *      — but we wrap in try/catch defensively so a future
 *      contract drift cannot crash the CLI.
 *   5. On `{ok:false}` we return the engine's reason verbatim
 *      and do NOT print the panel. The bin layer writes
 *      `wpsk info: <reason>` to stderr and exits 1.
 *   6. On `{ok:true}` we delegate pretty-printing to
 *      `ui.renderKitStatus(status, { json })`. The function
 *      returns the status object so the bin layer can also
 *      chain on it (e.g. read `status.updateAvailable` for a
 *      downstream prompt).
 *
 * Engine + ui + lookupLatest are injectable via the `deps`
 * arg. The bin layer (main.js) wires the real engine + a
 * real `lookupLatestKit` shim + the real ui.
 */

/* -------------------------------------------------------------------- */
/* runInfo                                                                */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} InfoInput
 * @property {string}  dir                 target project dir
 * @property {Object} [runOptions]        { json }
 * @property {string[]} [argv]            raw tail after the subcommand
 */

/**
 * @typedef {Object} InfoDeps
 * @property {Object}   engine            { getKitStatus }
 * @property {Object}  [ui]               { renderKitStatus }
 * @property {(currentVersion: string) => Promise<string|null>} [lookupLatestKit]
 */

/**
 * @param {string|InfoInput} dirOrInput   string (bin convenience) or
 *                                        object (programmatic callers)
 * @param {InfoDeps} [deps]
 * @returns {Promise<{
 *   ok: true,
 *   kitVersion: string,
 *   distMode: string,
 *   features: Object,
 *   path: string,
 *   updateAvailable?: boolean,
 *   latestKitVersion?: string,
 * }|{
 *   ok: false,
 *   reason: string,
 * }>}
 */
export async function runInfo(dirOrInput, deps = {}) {
  const d = deps || {};
  const engine = d.engine;
  const ui = d.ui || {};

  // 1. Dep validation. The lookup is optional (the engine has
  //    a default that resolves to null), but a non-default
  //    `lookupLatestKit` MUST be a function. The bin layer
  //    always injects one; tests inject a fake.
  if (!engine || typeof engine.getKitStatus !== "function") {
    return {
      ok: false,
      reason: "runInfo: deps.engine.getKitStatus is required",
    };
  }
  const lookupLatest =
    typeof d.lookupLatestKit === "function" ? d.lookupLatestKit : undefined;

  // 2. Resolve `dir` from the input shape. The bin layer
  //    passes a string for `wpsk info /abs/proj` and an
  //    object for `wpsk info --json` (where there is no
  //    positional arg). Both shapes are accepted.
  let dir;
  let runOptions = {};
  let argv = [];
  if (typeof dirOrInput === "string") {
    dir = dirOrInput;
  } else if (dirOrInput && typeof dirOrInput === "object") {
    dir = dirOrInput.dir;
    runOptions = dirOrInput.runOptions || {};
    argv = Array.isArray(dirOrInput.argv) ? dirOrInput.argv : [];
  }
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "runInfo: dir is required" };
  }

  // 3. Resolve `--json`. Priority: explicit runOptions.json,
  //    else a bare `--json` in the raw argv tail. We do NOT
  //    accept `--json=...` for the info command — info has
  //    only one binary flag, and the bare form is what
  //    commander's `.option("--json", ...)` auto-declares.
  const json = runOptions.json === true || argv.indexOf("--json") !== -1;

  // 4. Engine call. The engine's `getKitStatus` is async and
  //    is contractually "NEVER throws; a missing manifest is
  //    {ok:false}". We still wrap in try/catch because a
  //    future contract drift in the engine must not crash
  //    the CLI.
  let status;
  try {
    status = await engine.getKitStatus(dir, { lookupLatest });
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.getKitStatus threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }

  // 5. Surface the engine's `{ok:false}` verbatim. We do NOT
  //    print the panel on this path — there is nothing
  //    useful to show without a manifest.
  if (!status || status.ok !== true) {
    return {
      ok: false,
      reason: (status && status.reason) || "no manifest",
    };
  }

  // 6. Pretty-print via the ui seam. A missing
  //    `ui.renderKitStatus` is non-fatal — the result is
  //    still returned so the bin layer can decide. A thrown
  //    render does not destroy the structured result either;
  //    we surface a warning so the bin layer can mention it.
  if (typeof ui.renderKitStatus === "function") {
    try {
      await ui.renderKitStatus(status, { json });
    } catch (e) {
      return {
        ...status,
        warning:
          "ui.renderKitStatus threw: " +
          (e && e.message ? e.message : String(e)),
      };
    }
  }

  return status;
}
