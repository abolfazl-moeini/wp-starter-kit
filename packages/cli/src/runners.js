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

/* -------------------------------------------------------------------- */
/* gitStatus — read-only probe for `wpsk update --run` dirty guard        */
/* -------------------------------------------------------------------- */

/**
 * Probe `git status --porcelain` inside `dir`. The contract is
 * different from the other runners: this one is **read-only**
 * (no `git add` / `git commit` / `git push` — the user is about
 * to run a migration and we only need to know "is the tree
 * dirty?"). The shape:
 *
 *   { ok: true,  dirty: boolean, files: string[] }
 *   { ok: false, error: string }            ← when git is not
 *                                              on PATH, or the
 *                                              dir isn't a git
 *                                              working tree, or
 *                                              the porcelain parse
 *                                              fails.
 *   { ok: false, notARepo: true, dirty: false, files: [], reason: "..." }
 *                                              ← a special "this
 *                                              is not a git repo"
 *                                              answer. The `update`
 *                                              command treats this
 *                                              as a no-op (skip the
 *                                              dirty guard) rather
 *                                              than a hard error —
 *                                              a project may have
 *                                              been scaffolded
 *                                              without `--git`.
 *
 * The probe prefers the injected `execa` and `commandExists`
 * (so unit tests can wire fakes). When absent, the function
 * uses the real execa + a spawnSync-based commandExists
 * (same plumbing as the other runners).
 *
 * @param {string} dir
 * @param {{execa?: Function, commandExists?: Function, spawnSync?: Function}} [deps]
 * @returns {Promise<{
 *   ok: boolean,
 *   dirty?: boolean,
 *   files?: string[],
 *   notARepo?: boolean,
 *   reason?: string,
 *   error?: string,
 * }>}
 */
export async function gitStatus(dir, deps = {}) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, error: "gitStatus: dir is required" };
  }

  // Lazy imports — same pattern as the other runners, so unit
  // tests that inject `deps.execa` never resolve the real module.
  const execa = deps.execa || (await getDefaultExeca());
  const present = deps.commandExists || commandExists;
  const onPath = await present("git", { spawnSync: deps.spawnSync });
  if (!onPath) {
    return { ok: false, error: "git not found on PATH" };
  }

  // `git status --porcelain` exits 0 with an empty body when
  // the tree is clean OR when `dir` is not a git working tree.
  // We differentiate the two by checking the exit code in the
  // second branch: a "not a git repo" is a 128 with stderr
  // containing "not a git repository".
  let res;
  try {
    res = await execa("git", ["status", "--porcelain"], {
      cwd: dir,
      reject: false,
    });
  } catch (e) {
    return {
      ok: false,
      error: "git status failed to start: " + ((e && e.message) || e),
    };
  }

  if (res && res.exitCode === 0) {
    const files = String(res.stdout || "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return { ok: true, dirty: files.length > 0, files };
  }

  // Non-zero exit. Distinguish "not a git repo" from a real
  // failure. The error string is the convention every git
  // version ships with; relying on the literal keeps the
  // implementation simple and the contract explicit.
  const stderr = String((res && res.stderr) || "");
  if (/not a git repository/i.test(stderr)) {
    return {
      ok: false,
      notARepo: true,
      dirty: false,
      files: [],
      reason: "not a git repository (--git was not passed at create time)",
    };
  }
  return {
    ok: false,
    error:
      "git status failed (exit " +
      (res ? res.exitCode : "?") +
      "): " +
      stderr.trim(),
  };
}

/* -------------------------------------------------------------------- */
/* lookupLatestKit — `npm view @wpdev/cli version` shim                    */
/* -------------------------------------------------------------------- */

/**
 * Look up the latest version of `@wpdev/cli` on the npm
 * registry. Returns the trimmed stdout on success, or `null`
 * on ANY failure (no `npm` on PATH, non-zero exit, empty
 * output, spawn error, registry timeout). This function
 * NEVER throws — the engine's `getKitStatus` treats a
 * throwing `lookupLatest` as "no data" anyway, but a
 * throwing helper would also surface in unhandled-rejection
 * warnings and the bin layer's `parseAsync` catch. Returning
 * `null` is the load-bearing contract.
 *
 * Used by `wpsk info` (Phase I5) as the production
 * `lookupLatest` argument. The bin layer wires the real
 * `npm view`; tests inject a fake.
 *
 * Implementation choice: we use `execa` (already a CLI dep
 * for `npm install` / `composer install` / `git init`) so
 * the same code path handles a missing tool (we return
 * `null` rather than `{ok:false, skipped:true}` — the
 * engine's contract is "string|null", not a structured
 * result, so the surface here is the simpler one).
 *
 * The `cwd` is the user's project dir, NOT a temp dir —
 * `npm view` does not depend on the cwd, but it does
 * respect `.npmrc` files, and the user's project may
 * have a registry override we want to honor.
 *
 * @param {string} _currentVersion  the project's kitVersion
 *   (informational — included in the signature for parity
 *   with the engine's `lookupLatest(currentVersion)`
 *   contract; not used by this implementation).
 * @param {{execa?: Function, commandExists?: Function}} [deps]
 * @returns {Promise<string|null>}
 */
export async function lookupLatestKit(_currentVersion, deps = {}) {
  // The currentVersion arg is intentionally ignored — the
  // `npm view @wpdev/cli version` query returns the
  // registry's latest regardless of what we already have.
  // We keep it in the signature so this helper is a
  // drop-in for the engine's `lookupLatest`.
  void _currentVersion;
  const execa = deps.execa || (await getDefaultExeca());
  const present =
    typeof deps.commandExists === "function"
      ? deps.commandExists
      : commandExists;
  let onPath = false;
  try {
    onPath = await present("npm", deps);
  } catch {
    onPath = false;
  }
  if (!onPath) {
    return null;
  }
  let res;
  try {
    res = await execa("npm", ["view", "@wpdev/cli", "version"], {
      // `cwd` not set on purpose — `npm view` is registry-bound,
      // and a project-local `.npmrc` is what the user wants.
      stdio: "pipe",
      reject: false,
    });
  } catch {
    return null;
  }
  if (!res || res.exitCode !== 0) {
    return null;
  }
  const out = typeof res.stdout === "string" ? res.stdout.trim() : "";
  return out.length > 0 ? out : null;
}
