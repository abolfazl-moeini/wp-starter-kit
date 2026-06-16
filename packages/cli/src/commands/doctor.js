/**
 * `wpsk doctor` — diagnose system prerequisites and project
 * drift for the current project.
 *
 * Phase I5 of plan.installer.md (§I5.5 + §I5.6). Replaces the
 * I1 stub. The command runs two kinds of checks:
 *
 *   1. SYSTEM: the four system-tool probes the user's
 *      environment needs to run a wp-starter-kit project.
 *        - node  >= 18          (REQUIRED — hard error)
 *        - composer  any        (warning when missing; PHP-only
 *                                projects don't need it)
 *        - php  >= 7.4          (warning when missing; JS-only
 *                                projects don't need it)
 *        - git  any             (warning when missing; the
 *                                project may not use VCS)
 *
 *   2. PROJECT: the engine's `doctorProject(dir)` returns
 *      `{ok, warnings, errors}`. The warnings are non-fatal
 *      drift (e.g. "manifest newer than installed kit — run
 *      wpsk update"); the errors are fatal (e.g. "manifest
 *      missing", "unknown feature id").
 *
 * Exit code (encoded on the result, picked up by the bin):
 *   - 0 when the report has zero errors and zero warnings.
 *   - 1 when the report has at least one error (errors dominate).
 *   - 2 when the report has warnings but NO errors.
 *
 * The system probes are **injected** as `deps.checks` so unit
 * tests can simulate "node is 16" / "php is missing" without
 * spawning real subprocesses. The bin layer wires the real
 * probes (which use `runTool`-style execa wrappers).
 *
 * Engine + checks + ui are injectable via the `deps` arg. The
 * bin layer (main.js) wires the real engine + probes + ui.
 */

/* -------------------------------------------------------------------- */
/* System probes — default implementations (the bin layer wires these)   */
/* -------------------------------------------------------------------- */

/**
 * Probe `node --version`. Returns
 *   { name, ok, found, version, reason? }
 *
 * Missing → `ok:false, found:false`.
 * Found but < 18 → `ok:false, found:true, version, reason`.
 * Found and >= 18 → `ok:true, found:true, version`.
 *
 * The implementation reads the major version from the
 * `vX.Y.Z` line `node --version` prints. A future "node 20+
 * required" change is a one-line edit here.
 *
 * @param {{exec?: Function, commandExists?: Function}} [deps]
 * @returns {Promise<{name: string, ok: boolean, found: boolean, version?: string, reason?: string}>}
 */
export async function checkNodeVersion(deps = {}) {
  return checkToolVersion({
    tool: "node",
    args: ["--version"],
    minimumMajor: 18,
    deps,
  });
}

/**
 * Probe `composer --version`. Returns the same shape. No
 * minimum-version check — composer is a "is it on PATH?"
 * probe (the kit's PHP deps are version-agnostic at the
 * install-time step).
 *
 * @param {{exec?: Function, commandExists?: Function}} [deps]
 */
export async function checkComposer(deps = {}) {
  return checkToolVersion({
    tool: "composer",
    args: ["--version"],
    deps,
  });
}

/**
 * Probe `php --version`. Returns the same shape. Minimum
 * version is 7.4 (the kit's `phpMinVersion` floor; matches
 * plan.v3.md §11 defaults).
 *
 * @param {{exec?: Function, commandExists?: Function}} [deps]
 */
export async function checkPhpVersion(deps = {}) {
  return checkToolVersion({
    tool: "php",
    args: ["--version"],
    minimumMajor: 7,
    // `php --version` writes the version on the FIRST line,
    // prefixed with "PHP " (e.g. "PHP 8.1.0 (cli) ..."). The
    // generic `checkToolVersion` parser looks for the first
    // X.Y.Z pattern; for php that pattern is on line 1.
    deps,
  });
}

/**
 * Probe `git --version`. No minimum-version check.
 *
 * @param {{exec?: Function, commandExists?: Function}} [deps]
 */
export async function checkGit(deps = {}) {
  return checkToolVersion({
    tool: "git",
    args: ["--version"],
    deps,
  });
}

/* -------------------------------------------------------------------- */
/* checkToolVersion — shared implementation                               */
/* -------------------------------------------------------------------- */

/**
 * Generic "is this tool on PATH? What's its version?" probe.
 * Used by the four system checks above. Returns the
 * `{name, ok, found, version?, reason?}` shape. The `deps`
 * arg is for injection: a real bin invocation provides
 * `{exec}` (a `child_process.exec`-style function); tests
 * inject a fake that returns a controlled string.
 *
 * @param {object}   opts
 * @param {string}   opts.tool          e.g. 'node'
 * @param {string[]} opts.args          e.g. ['--version']
 * @param {number}   [opts.minimumMajor]   if set, versions with
 *                                        a smaller major are
 *                                        `ok:false`
 * @param {{exec?: Function, commandExists?: Function}} [opts.deps]
 */
async function checkToolVersion({ tool, args, minimumMajor, deps = {} }) {
  // Default implementations. The `exec` shim uses
  // `node:child_process`'s `execFile` (no shell, no quoting
  // risks) and resolves to { stdout, stderr } on success.
  let exec = deps.exec;
  if (typeof exec !== "function") {
    const { execFile } = await import("node:child_process");
    const util = await import("node:util");
    exec = util.promisify(execFile);
  }
  let commandExists = deps.commandExists;
  if (typeof commandExists !== "function") {
    // Reuse the runners.js helper so the existence check
    // has the same path-resolution logic as the install
    // runners. Avoids duplicating the "which -s <cmd>" /
    // "where <cmd>" dance.
    const runners = await import("../runners.js");
    commandExists = runners.commandExists;
  }

  const onPath = await commandExists(tool);
  if (!onPath) {
    return {
      name: tool,
      ok: false,
      found: false,
      reason: tool + " not found on PATH",
    };
  }

  let stdout = "";
  try {
    const out = await exec(tool, args, { windowsHide: true });
    stdout = String((out && out.stdout) || "");
  } catch (e) {
    // The tool printed to stderr (e.g. some versions of
    // `composer` write version to stderr). We still treat
    // the call as a failure but include the stderr in the
    // reason so the user can debug.
    const stderr = String((e && e.stderr) || (e && e.message) || e);
    return {
      name: tool,
      ok: false,
      found: true,
      reason: tool + " exited non-zero: " + stderr.trim(),
    };
  }

  // Parse the version. Both "v20.0.0" (node) and "PHP 8.1.0"
  // (php) and "Composer version 2.5.0 ..." shapes are
  // supported. The first X.Y.Z pattern wins.
  const match = stdout.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    return {
      name: tool,
      ok: false,
      found: true,
      reason: tool + " returned no parseable version",
    };
  }
  const version = match[0];
  const major = parseInt(match[1], 10) || 0;

  if (typeof minimumMajor === "number" && major < minimumMajor) {
    return {
      name: tool,
      ok: false,
      found: true,
      version,
      reason: tool + " " + major + " is below the required " + minimumMajor,
    };
  }

  return { name: tool, ok: true, found: true, version };
}

/* -------------------------------------------------------------------- */
/* runDoctor                                                              */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} DoctorInput
 * @property {string}  dir                 target project dir
 * @property {Object} [runOptions]         { json }
 */

/**
 * @typedef {Object} DoctorDeps
 * @property {Object}  engine              { doctorProject }
 * @property {Object}  checks              { checkNodeVersion, checkComposer,
 *                                            checkPhpVersion, checkGit }
 * @property {Object}  [ui]                { renderDoctor }
 */

/**
 * @param {string|DoctorInput} dirOrInput
 * @param {DoctorDeps} [deps]
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   report?: {
 *     system: Array<{name,ok,found,version?,reason?}>,
 *     project: { ok: boolean, warnings: string[], errors: string[] }
 *   },
 *   code?: number,
 *   json?: boolean,
 *   warning?: string,
 * }>}
 */
export async function runDoctor(dirOrInput, deps = {}) {
  const d = deps || {};
  const engine = d.engine;
  const ui = d.ui || {};
  const checks = d.checks || {};

  // 1. Resolve the input shape. The bin layer passes a
  //    string for `wpsk doctor /abs/proj` and an object
  //    for `wpsk doctor --json` (no positional). Both
  //    shapes are accepted.
  let dir;
  let runOptions = {};
  if (typeof dirOrInput === "string") {
    dir = dirOrInput;
  } else if (dirOrInput && typeof dirOrInput === "object") {
    dir = dirOrInput.dir;
    runOptions = dirOrInput.runOptions || {};
  }
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "runDoctor: dir is required" };
  }

  if (!engine || typeof engine.doctorProject !== "function") {
    return {
      ok: false,
      reason: "runDoctor: deps.engine.doctorProject is required",
    };
  }

  // 2. Run the system probes in parallel. The order of
  //    the resulting `system` array is the canonical
  //    spec order (node, composer, php, git); tests assert
  //    this order. The `Promise.all` keeps the wall time
  //    bounded by the slowest probe.
  const probes = [
    typeof checks.checkNodeVersion === "function"
      ? checks.checkNodeVersion()
      : checkNodeVersion(),
    typeof checks.checkComposer === "function"
      ? checks.checkComposer()
      : checkComposer(),
    typeof checks.checkPhpVersion === "function"
      ? checks.checkPhpVersion()
      : checkPhpVersion(),
    typeof checks.checkGit === "function" ? checks.checkGit() : checkGit(),
  ];
  let systemResults;
  try {
    systemResults = await Promise.all(probes);
  } catch (e) {
    // A single throwing probe shouldn't crash the doctor —
    // we replace the failed slot with a synthesized
    // "ok:false" entry so the user still sees the other
    // three results.
    systemResults = probes.map(() => ({
      name: "?",
      ok: false,
      found: false,
      reason: "probe threw: " + (e && e.message ? e.message : String(e)),
    }));
  }

  // 3. Run the engine's project doctor. The contract is
  //    "NEVER throws; a missing manifest is {errors:
  //    ['manifest missing']}". We wrap in try/catch
  //    because a future contract drift must not crash
  //    the CLI.
  let projectReport;
  try {
    projectReport = engine.doctorProject(dir);
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.doctorProject threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }
  // Defensive normalize — the engine is supposed to
  // return the shape, but a misbehaving future version
  // shouldn't crash the doctor.
  const project = {
    ok: !!(projectReport && projectReport.ok === true),
    warnings: Array.isArray(projectReport && projectReport.warnings)
      ? projectReport.warnings
      : [],
    errors: Array.isArray(projectReport && projectReport.errors)
      ? projectReport.errors
      : [],
  };

  // 4. Build the combined report. The system "errors" are
  //    the probes that returned `ok:false AND found:true`
  //    (a real failure — too-old version) OR
  //    `ok:false AND found:false` for HARD requirements
  //    (node only). Composer's "missing" is a warning, not
  //    an error, because PHP-only projects are valid. Same
  //    for php (JS-only) and git (no VCS).
  const sysErrors = [];
  const sysWarnings = [];
  for (let i = 0; i < systemResults.length; i++) {
    const s = systemResults[i];
    if (s && s.ok === true) continue;
    // The first probe is `node` (the only HARD requirement
    // in the system list). The other three missing/too-old
    // are warnings.
    if (i === 0) {
      sysErrors.push(
        s && s.reason ? "node: " + s.reason : "node: not available",
      );
    } else {
      const name = s && s.name ? s.name : "?";
      sysWarnings.push(
        s && s.reason ? name + ": " + s.reason : name + ": not available",
      );
    }
  }

  const report = {
    system: systemResults,
    project: {
      ...project,
      // Fold the system buckets into the project shape so
      // the user sees a single warnings/errors list. This
      // matches the spec: "exit code 1 if any error, 2 if
      // only warnings".
      warnings: [...project.warnings, ...sysWarnings],
      errors: [...project.errors, ...sysErrors],
    },
  };

  // 5. Compute the exit code. errors > 0 → 1; only
  //    warnings → 2; clean → 0.
  let code = 0;
  if (report.project.errors.length > 0) {
    code = 1;
  } else if (report.project.warnings.length > 0) {
    code = 2;
  }

  // 6. Pretty-print. A missing ui.renderDoctor is
  //    non-fatal (the result is still returned). A
  //    thrown render does not destroy the structured
  //    result either.
  if (typeof ui.renderDoctor === "function") {
    try {
      await ui.renderDoctor(report, { code, json: runOptions.json === true });
    } catch (e) {
      return {
        ok: true,
        report,
        code,
        json: runOptions.json === true,
        warning:
          "ui.renderDoctor threw: " + (e && e.message ? e.message : String(e)),
      };
    }
  }

  return {
    ok: code === 0,
    report,
    code,
    json: runOptions.json === true,
  };
}
