/**
 * `runners.js` — child-process wrappers for `npm install`,
 * `composer install`, `git init`. Phase I3 + I6 of plan.installer.md.
 *
 * Each runner is a pure orchestration: it takes a target
 * directory, a `verbose` flag, and an injectable `deps` object
 * (so unit tests can mock `execa` and `commandExists`). When
 * `deps` is omitted, the real execa + a `commandExists` based on
 * a `which`-style child-process call are used.
 *
 * Contract (locked by tests/cli/runners.test.js):
 *   - Never throws. Every error path returns a structured result.
 *   - `{ok:true}` on a zero exit.
 *   - `{ok:false, skipped:true, reason}` when the tool is not on
 *     PATH (the create run continues with a warning).
 *   - `{ok:false, error}` on a non-zero exit (NOT skipped — the
 *     user should know the install actually failed).
 *   - `verbose:true` → `stdio:'inherit'` so the user sees live
 *     output. `verbose:false` (default) → `stdio:'pipe'` so the
 *     output is captured and silenced.
 *
 * Implementation note: `commandExists` uses `node:child_process`'s
 * `spawnSync` (no external dep) so the kit's runner works even
 * in environments where the dev didn't `npm install` execa
 * transitively. execa itself is loaded lazily inside each runner
 * so the *unit* tests that mock `deps.execa` never need to
 * import the real execa — they avoid the ESM/CJS-jest problem
 * entirely.
 */
import { spawnSync } from "node:child_process";

/* -------------------------------------------------------------------- */
/* commandExists — does `which -s <cmd>` succeed?                        */
/* -------------------------------------------------------------------- */

/**
 * @param {string} cmd
 * @param {{spawnSync?: Function}} [deps]
 * @returns {Promise<boolean>}
 */
export async function commandExists(cmd, deps = {}) {
  if (typeof cmd !== "string" || cmd.length === 0) {
    return false;
  }
  const spawn = deps.spawnSync || spawnSync;
  // `which` is the most portable cross-platform tool-presence
  // probe. On Windows we fall back to `where` (no flag — `where`
  // uses no `-s`).
  const isWin = process.platform === "win32";
  const tool = isWin ? "where" : "which";
  const args = isWin ? [cmd] : ["-s", cmd];
  let res;
  try {
    res = spawn(tool, args, {
      stdio: "ignore",
      windowsHide: true,
    });
  } catch {
    return false;
  }
  return !!(res && res.status === 0);
}

/* -------------------------------------------------------------------- */
/* shared runner — used by npmInstall / composerInstall / gitInit       */
/* -------------------------------------------------------------------- */

/**
 * Lazily load execa. We do this dynamically (and inside each
 * runner call) so unit tests that mock `deps.execa` never need
 * to actually resolve the real execa module — they never reach
 * the import line.
 *
 * @returns {Promise<Function>}
 */
async function getDefaultExeca() {
  const m = await import("execa");
  return m.execa;
}

/**
 * Run a single subprocess. Returns a structured result; never
 * throws.
 *
 * @param {object} opts
 * @param {string}   opts.tool       e.g. 'npm'
 * @param {string[]} opts.args       e.g. ['install']
 * @param {string}   opts.cwd
 * @param {object}   [opts.runOpts]  forwarded to the caller
 * @param {string}   [opts.runOpts.toolDisplay]
 *                                  pretty name for skipped reason
 * @param {boolean}  [opts.runOpts.verbose]
 * @param {{execa?: Function, commandExists?: Function, spawnSync?: Function}} [deps]
 * @returns {Promise<
 *   {ok:true} |
 *   {ok:false, skipped:true, reason:string} |
 *   {ok:false, error:string}
 * >}
 */
async function runTool({ tool, args, cwd, runOpts = {} }, deps = {}) {
  const execa = deps.execa || (await getDefaultExeca());
  const present = deps.commandExists || commandExists;

  // 1. Tool presence — fail soft if the tool is missing.
  const onPath = await present(tool, {
    spawnSync: deps.spawnSync,
  });
  if (!onPath) {
    return {
      ok: false,
      skipped: true,
      reason: `${runOpts.toolDisplay || tool} not found on PATH — skipping ${tool} ${args.join(" ")}`,
    };
  }

  // 2. Run it. reject:false so non-zero exits return a result
  //    instead of throwing; we still wrap the call in try/catch
  //    so a spawn-time failure (e.g. ENOENT) is also caught.
  const stdio = runOpts.verbose ? "inherit" : "pipe";
  let res;
  try {
    res = await execa(tool, args, {
      cwd,
      stdio,
      reject: false,
    });
  } catch (e) {
    return {
      ok: false,
      error: `${tool} ${args.join(" ")} failed to start: ${(e && e.message) || e}`,
    };
  }

  if (res && res.exitCode === 0) {
    return { ok: true };
  }

  // Non-zero exit. Pull the most useful message the result
  // carries (shortMessage, stderr, or "exit code N").
  const detail =
    (res && (res.shortMessage || res.stderr || res.all)) ||
    `exit code ${res ? res.exitCode : "?"}`;
  return {
    ok: false,
    error: `${tool} ${args.join(" ")} failed: ${typeof detail === "string" ? detail.trim() : String(detail)}`,
  };
}

/* -------------------------------------------------------------------- */
/* Public runners                                                        */
/* -------------------------------------------------------------------- */

/**
 * Run `npm install` inside `dir`.
 *
 * @param {string} dir
 * @param {{verbose?: boolean}} [runOpts]
 * @param {{execa?: Function, commandExists?: Function, spawnSync?: Function}} [deps]
 * @returns {Promise<{ok:boolean, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function npmInstall(dir, runOpts = {}, deps) {
  return runTool(
    {
      tool: "npm",
      args: ["install"],
      cwd: dir,
      runOpts: { ...runOpts, toolDisplay: "npm" },
    },
    deps,
  );
}

/**
 * Run `composer install` inside `dir`.
 *
 * @param {string} dir
 * @param {{verbose?: boolean}} [runOpts]
 * @param {{execa?: Function, commandExists?: Function, spawnSync?: Function}} [deps]
 * @returns {Promise<{ok:boolean, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function composerInstall(dir, runOpts = {}, deps) {
  return runTool(
    {
      tool: "composer",
      args: ["install"],
      cwd: dir,
      runOpts: { ...runOpts, toolDisplay: "composer" },
    },
    deps,
  );
}

/**
 * Run `git init` inside `dir`.
 *
 * @param {string} dir
 * @param {{verbose?: boolean}} [runOpts]
 * @param {{execa?: Function, commandExists?: Function, spawnSync?: Function}} [deps]
 * @returns {Promise<{ok:boolean, skipped?: boolean, reason?: string, error?: string}>}
 */
export async function gitInit(dir, runOpts = {}, deps) {
  return runTool(
    {
      tool: "git",
      args: ["init"],
      cwd: dir,
      runOpts: { ...runOpts, toolDisplay: "git" },
    },
    deps,
  );
}
