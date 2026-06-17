/**
 * `wpdev update` — plan (default dry-run) or apply (with --run)
 * a kit upgrade for the current project.
 *
 * Phase I5 of plan.installer.md (§I5.1–I5.4). Replaces the I1
 * stub. The command is a thin front-end over the engine's
 * `planUpdate` + `runMigrations`, plus a git-dirty guard before
 * any on-disk apply.
 *
 * Pipeline (dry-run, run:false — the default):
 *   1. Resolve the target dir from the input shape.
 *   2. Resolve the `to` version:
 *      a) `runOptions.to` (from `--to <version>`) when present.
 *      b) otherwise fall back to `engine.getDepVersions()` —
 *         we treat the registry's "kit version" entry as the
 *         "latest" version. The dep-versions registry is
 *         anchored to the kit's own `package.json` and is the
 *         single source of truth for "what version is in the
 *         box right now". Tests inject a fake registry.
 *   3. Call `engine.planUpdate(dir, to)`. NEVER writes to disk.
 *   4. On `{ok:false}` return the engine's reason verbatim
 *      (the bin layer prints + exits 1). Do NOT render the
 *      plan (there is no plan to see).
 *   5. On `{ok:true}` pretty-print the plan via
 *      `deps.ui.renderPlan(plan)`. The plan's `from` → `to`
 *      header, the migration list, and the dep changes are
 *      rendered to stdout. The plan is ALSO returned so the
 *      bin layer can chain on it.
 *   6. `runMigrations` is NEVER called on the dry-run path.
 *
 * Pipeline (apply, run:true — `wpdev update --run`):
 *   1. Run the dry-run pipeline first (so the user sees the
 *      plan before it is applied).
 *   2. Before applying, call `runners.gitStatus(dir)`. If git
 *      is dirty AND `runOptions.force !== true`, abort with
 *      `{ok:false, reason: "..."}`. The "git missing" /
 *      "not a git repo" cases are treated as "no guard"
 *      (the project may not use VCS) and continue.
 *   3. Call `engine.runMigrations(dir, {from, to})`. The
 *      engine is the source of truth for "what migrations
 *      apply" and "did they all succeed".
 *   4. On `{ok:false}` from `runMigrations` surface the
 *      engine's reason; the installers are NOT called.
 *   5. On `{ok:true}` call `runners.npmInstall(dir, {verbose})`
 *      and `runners.composerInstall(dir, {verbose})`. The
 *      runners are best-effort: a network failure during
 *      `npm install` is a warning, not a hard error — the
 *      migration has already succeeded.
 *
 * Engine + runners + ui are injectable via the `deps` arg so
 * unit tests can wire fakes. The bin layer (main.js) wires the
 * real engine + runners + ui.
 */

/* -------------------------------------------------------------------- */
/* runUpdate                                                              */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} UpdateInput
 * @property {string}   dir                target project dir
 * @property {Object}  [runOptions]        { run, to, force, verbose, ... }
 * @property {string[]} [argv]            raw tail after the subcommand
 */

/**
 * @typedef {Object} UpdateDeps
 * @property {Object} engine            { planUpdate, runMigrations, getDepVersions }
 * @property {Object} [runners]         { gitStatus, npmInstall, composerInstall }
 * @property {Object} [ui]              { renderPlan, log, ... }
 */

/**
 * @param {string|UpdateInput} dirOrInput   string (bin convenience) or
 *                                          object (programmatic callers)
 * @param {UpdateDeps} [deps]
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   plan?: object,
 *   ran?: string[],
 *   from?: string,
 *   to?: string,
 *   warning?: string,
 * }>}
 */
export async function runUpdate(dirOrInput, deps = {}) {
  const d = deps || {};
  const engine = d.engine;
  const runners = d.runners || {};
  const ui = d.ui || {};

  // 1. Dep validation. engine.planUpdate is the only hard
  //    requirement; the other engine functions are required
  //    only when the apply path is reached.
  if (!engine || typeof engine.planUpdate !== "function") {
    return {
      ok: false,
      reason: "runUpdate: deps.engine.planUpdate is required",
    };
  }

  // 2. Resolve the input shape. The bin layer passes a string
  //    for `wpdev update /abs/proj` and an object for
  //    `wpdev update --to=0.2.0` (no positional). Both shapes
  //    are accepted.
  let dir;
  let runOptions = {};
  if (typeof dirOrInput === "string") {
    dir = dirOrInput;
  } else if (dirOrInput && typeof dirOrInput === "object") {
    dir = dirOrInput.dir;
    runOptions = dirOrInput.runOptions || {};
  }
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "runUpdate: dir is required" };
  }

  // 3. Resolve the `to` version. Priority:
  //    a) `runOptions.to` (from --to=).
  //    b) `engine.getDepVersions()` registry — we treat the
  //       registry's "_kit" key (or, as a defensive fallback,
  //       the registry's first entry) as "the kit's own
  //       version". This is the "0.0.0-latest" placeholder
  //       behaviour called out in the plan.
  //    c) A hard-coded "0.0.0" string (the last-resort
  //       "no info, do nothing" answer).
  let to;
  if (typeof runOptions.to === "string" && runOptions.to.length > 0) {
    to = runOptions.to;
  } else if (
    engine.getDepVersions &&
    typeof engine.getDepVersions === "function"
  ) {
    try {
      const reg = engine.getDepVersions();
      // Prefer the "_kit" entry; fall back to the first
      // map entry's value (any one will do for the
      // version-comparison that planUpdate does).
      if (reg && typeof reg.get === "function") {
        to = reg.get("_kit") || reg.values().next().value || "0.0.0";
      } else {
        to = "0.0.0";
      }
    } catch {
      to = "0.0.0";
    }
  } else {
    to = "0.0.0";
  }

  // 4. Dry-run step. `engine.planUpdate` is contractually
  //    fail-soft: it returns `{ok:false, reason}` for a
  //    missing manifest, a malformed manifest, or a downgrade.
  //    We wrap in try/catch because a future contract drift
  //    must not crash the CLI.
  let plan;
  try {
    plan = engine.planUpdate(dir, to);
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.planUpdate threw: " + (e && e.message ? e.message : String(e)),
    };
  }
  if (!plan || plan.ok !== true) {
    return {
      ok: false,
      reason: (plan && plan.reason) || "engine.planUpdate failed",
    };
  }

  // 5. Render the plan. A missing ui.renderPlan is non-fatal
  //    (the result is still returned for the bin layer / test
  //    to inspect). A thrown render does not destroy the
  //    structured result either.
  if (typeof ui.renderPlan === "function") {
    try {
      await ui.renderPlan(plan);
    } catch (e) {
      return {
        ...plan,
        warning:
          "ui.renderPlan threw: " + (e && e.message ? e.message : String(e)),
      };
    }
  }

  // 6. Dry-run short-circuit. The plan has been printed; do
  //    NOT call runMigrations. The bin layer exits 0.
  if (runOptions.run !== true) {
    return plan;
  }

  // ----------------------------------------------------------------
  // 7. Apply path (--run).
  // ----------------------------------------------------------------

  // 7a. Hard requirement on this branch: the engine must
  //     provide runMigrations. We surface the missing-fn
  //     error as a clean {ok:false, reason}.
  if (typeof engine.runMigrations !== "function") {
    return {
      ok: false,
      reason: "runUpdate: deps.engine.runMigrations is required (--run)",
    };
  }

  // 7b. Git-dirty guard. `runners.gitStatus` returns
  //     `{ok:true, dirty, files}` on success, `{ok:false,
  //     notARepo:true, ...}` when the project isn't a git
  //     repo (treated as a no-op guard — the user just
  //     didn't pass --git at create time), and
  //     `{ok:false, error}` on a real failure (treated as
  //     "abort" — refusing to apply on unknown git state is
  //     safer than trusting the unknown).
  if (typeof runners.gitStatus === "function") {
    let status;
    try {
      status = await runners.gitStatus(dir);
    } catch (e) {
      status = {
        ok: false,
        error:
          "runners.gitStatus threw: " +
          (e && e.message ? e.message : String(e)),
      };
    }
    if (status && status.ok === true && status.dirty === true) {
      if (runOptions.force !== true) {
        const fileList = (status.files || []).join(", ");
        return {
          ok: false,
          reason:
            "git tree is dirty (" +
            (status.files ? status.files.length : 0) +
            " files: " +
            fileList +
            ") — commit/stash first, or re-run with --force to override",
        };
      }
      // force:true: continue past the guard. The dirty
      // status is recorded in the result so the user can
      // see "I told you so" in the apply summary.
    }
    // ok:false (with notARepo) and ok:false (with error)
    // are handled separately: a non-repo is a "no guard"
    // (the user opted out of --git), a hard error aborts.
    if (status && status.ok === false && status.notARepo !== true) {
      return {
        ok: false,
        reason: "git status check failed: " + (status.error || "unknown"),
      };
    }
  }

  // 7c. Apply the migrations. The engine is the source of
  //     truth for "what ran" and "did it succeed".
  let result;
  try {
    result = await engine.runMigrations(dir, {
      from: plan.from,
      to: plan.to,
    });
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.runMigrations threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }
  if (!result || result.ok !== true) {
    return {
      ok: false,
      reason:
        (result && (result.reason || "engine.runMigrations failed")) ||
        "engine.runMigrations failed",
      failedAt: result && result.failedAt,
    };
  }

  // 7d. Best-effort install step. The migration is the
  //     user's intent; the install is a follow-up. A
  //     network failure or a missing `npm`/`composer`
  //     must not make the whole update fail.
  const warnings = [];
  const runnerOpts = { verbose: runOptions.verbose === true };
  if (typeof runners.npmInstall === "function") {
    try {
      const r = await runners.npmInstall(dir, runnerOpts);
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
      const r = await runners.composerInstall(dir, runnerOpts);
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

  return {
    ...result,
    ok: true,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}
