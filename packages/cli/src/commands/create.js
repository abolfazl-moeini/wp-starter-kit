/**
 * `wpdev create` — Phase I3. Scaffold a new wp-starter-kit plugin
 * end-to-end.
 *
 * Pipeline (plan.installer.md §I3):
 *   1. Validate the target dir (empty/new OK; existing non-empty
 *      without --force → refuse).
 *   2. Resolve the slug (sanitized).
 *   3. Call `engine.scaffoldProject(dir, answers, {features, force})`.
 *   4. If engine.scaffoldProject returns {ok:false} → return
 *      `{ok:false, reason}` (no post-gen actions).
 *   5. Build + write the manifest (`wpdev.json`) using
 *      `kitVersion` from `readEnginePackageVersion()` (or the
 *      `runOptions.kitVersion` override for tests).
 *   6. Run post-generation actions, gated by runOptions:
 *        - install → npmInstall / composerInstall (with the §I3.7
 *          gating rules).
 *        - git → gitInit.
 *      Each wrapped in try/catch → warn on failure, do not abort.
 *   7. Return `{ok, written, manifestPath, warnings}`.
 *
 * The function NEVER throws on engine / runner errors. The bin
 * layer (main.js) treats `{ok:false, reason}` as a fatal error
 * and exits 1.
 *
 * Engine + runners + ui + readEnginePackageVersion are all
 * injectable via the `deps` arg so unit tests can wire fakes.
 */
import * as path from "node:path";
import { readFileSync, existsSync } from "node:fs";

import { sanitizeSlug } from "../slug.js";
import {
  formatCreateTargetDirConflictReason,
  isCreateTargetDirNonEmpty,
} from "../resolveTargetDir.js";

/* -------------------------------------------------------------------- */
/* Default dependency wiring (used by the bin; tests inject)            */
/* -------------------------------------------------------------------- */

/**
 * Read the on-disk package.json of `@wpdev/create-wp-project` to
 * discover the kit version. Resolution order:
 *   1. `cwd()/packages/create-wp-project/package.json` (kit's
 *      local workspace, which is the common case).
 *   2. As a last resort, return whatever `readFileSync` reads
 *      from (1) — the manifest writer is defensive about
 *      missing files.
 */
function defaultReadEnginePackageVersion() {
  const candidates = [
    path.join(process.cwd(), "packages/create-wp-project/package.json"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        const pkg = JSON.parse(readFileSync(c, "utf8"));
        if (typeof pkg.version === "string" && pkg.version.length > 0) {
          return pkg.version;
        }
      } catch {
        /* fall through */
      }
    }
  }
  return "0.0.0";
}

/* -------------------------------------------------------------------- */
/* runCreate                                                             */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} CreateInput
 * @property {string}  dir           target dir (absolute or relative)
 * @property {object}  answers       branding answers
 * @property {object}  features      feature set
 * @property {object}  runOptions    {install, git, force, kitVersion, ...}
 * @property {string}  [slug]        pre-derived slug (sanitized); when
 *                                   absent we sanitize answers.slug.
 */

/**
 * @typedef {Object} CreateDeps
 * @property {object}  engine              { scaffoldProject, buildManifest,
 *                                          writeManifest }
 * @property {object}  runners             { npmInstall, composerInstall,
 *                                          gitInit }
 * @property {object}  ui                  { renderSummary, renderNextSteps,
 *                                          log }
 * @property {Function} readEnginePackageVersion  () => string
 */

/**
 * @param {CreateInput} input
 * @param {CreateDeps}  deps
 * @returns {Promise<{
 *   ok: boolean,
 *   reason?: string,
 *   written?: string[],
 *   manifestPath?: string,
 *   warnings?: string[],
 * }>}
 */
export async function runCreate(input, deps) {
  const i = input || {};
  const d = deps || {};
  const engine = d.engine;
  const runners = d.runners || {};
  const readVersion =
    d.readEnginePackageVersion || defaultReadEnginePackageVersion;

  if (!engine || typeof engine.scaffoldProject !== "function") {
    return {
      ok: false,
      reason: "runCreate: deps.engine.scaffoldProject is required",
    };
  }

  // 1. Validate target dir. The dir may be undefined if the user
  //    did not pass one — we synthesize a sensible default from
  //    the slug later, but the spec requires the caller to
  //    provide it (or accept the engine's default).
  const rawDir = i.dir || i.runOptions?.targetDir;
  if (!rawDir || typeof rawDir !== "string") {
    return {
      ok: false,
      reason:
        "runCreate: dir is required (positional slug, --dir= or runOptions.targetDir)",
    };
  }
  const dir = path.resolve(rawDir);

  // 2. Slug derivation: explicit runOptions.slug wins, then
  //    positional / answers.slug, then the last path component
  //    of the dir. The fallback chain is consulted top-down —
  //    if the user explicitly supplied a slug (even one that
  //    sanitizes to empty), we use it and surface the
  //    sanitization failure as an error rather than silently
  //    using the dir basename.
  const candidates = [i.runOptions?.slug, i.slug, i.answers?.slug];
  const userSlug = candidates.find(
    (s) => typeof s === "string" && s.length > 0,
  );
  const rawSlug = userSlug !== undefined ? userSlug : path.basename(dir);
  const slug = sanitizeSlug(rawSlug);
  if (!slug) {
    return {
      ok: false,
      reason:
        "runCreate: could not derive a valid slug from '" +
        String(rawSlug) +
        "' (slug must be lowercase kebab-case, " +
        "letters / digits / dashes only)",
    };
  }

  // 3. Non-empty dir guard. If the dir contains anything that
  //    looks like an existing project (project.config.json OR
  //    more than zero files), refuse unless --force is set.
  const force = i.runOptions?.force === true;
  if (!force) {
    const conflict = await isCreateTargetDirNonEmpty(dir);
    if (conflict) {
      return {
        ok: false,
        reason: formatCreateTargetDirConflictReason(dir),
      };
    }
  }

  // 4. Engine call. We pass the answers with the sanitized slug
  //    overriding the raw input (so the engine never sees
  //    'My Plugin!' — it sees 'my-plugin'). We also derive
  //    `uiFramework` from `features.jsLib` (the engine's
  //    pre-Phase-21 `validateAnswers` requires it; the kit
  //    treats the same value as the renderer token).
  //    Features go inside the options object per the
  //    plan.v3.md Appendix C signature. `force` is forwarded
  //    as-is (true / false / undefined) so tests can assert
  //    the call args literally. The pre-scaffold dir check
  //    above already consulted `force` for its own gating
  //    decision.
  const features = i.features || {};
  const uiFramework =
    features.jsLib === "preact" || features.jsLib === "react"
      ? features.jsLib
      : undefined;
  const answersWithSlug = {
    ...(i.answers || {}),
    slug,
    ...(uiFramework ? { uiFramework } : {}),
  };
  const forceValue = i.runOptions?.force;
  const engineOpts = { features };
  if (forceValue !== undefined) {
    engineOpts.force = forceValue;
  }
  let engineResult;
  try {
    engineResult = await engine.scaffoldProject(
      dir,
      answersWithSlug,
      engineOpts,
    );
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.scaffoldProject threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }

  if (!engineResult || !engineResult.ok) {
    return {
      ok: false,
      reason: (engineResult && engineResult.reason) || "engine scaffold failed",
    };
  }

  const written = engineResult.written || [];
  const warnings = [];

  // 5. Manifest write. kitVersion comes from the engine's
  //    package.json unless `runOptions.kitVersion` overrides
  //    (test seam only).
  const kitVersion = i.runOptions?.kitVersion || readVersion();
  const manifestPath = path.join(dir, "wpdev.json");
  try {
    const manifest =
      typeof engine.buildManifest === "function"
        ? engine.buildManifest({ kitVersion, features: i.features || {} })
        : {
            schema: 2,
            kitVersion,
            distMode: "deps",
            generatedAt: new Date().toISOString(),
            features: { ...(i.features || {}) },
          };
    if (typeof engine.writeManifest === "function") {
      await engine.writeManifest(dir, manifest);
    } else {
      warnings.push("engine.writeManifest is missing — wpdev.json NOT written");
    }
  } catch (e) {
    warnings.push(
      "failed to write wpdev.json: " + (e && e.message ? e.message : String(e)),
    );
  }

  // 6. Post-generation actions. Each is gated and best-effort.
  //    We collect warnings; the run continues regardless.
  const ui = d.ui || {};
  let postRunOptions = { ...(i.runOptions || {}) };
  if (
    postRunOptions.interactive !== false &&
    postRunOptions.yes !== true &&
    typeof ui.confirm === "function"
  ) {
    if (postRunOptions.install !== true) {
      const installNow = await ui.confirm({
        message: "Install dependencies now? (npm + composer)",
        initial: false,
      });
      if (installNow === true) postRunOptions.install = true;
    }
    if (postRunOptions.git !== true) {
      const initGit = await ui.confirm({
        message: "Initialize a git repository?",
        initial: false,
      });
      if (initGit === true) postRunOptions.git = true;
    }
  }

  if (postRunOptions.install === true) {
    // 6a. npm install — only if the project has (or might have) a
    //     package.json. Per the §I3.7 rule: when js is 'none' AND
    //     husky is 'off' the engine does NOT emit a package.json
    //     (it would be empty). For our gating we use the features
    //     the caller resolved; the engine is the source of truth
    //     for what was actually written, so we re-check the file
    //     system before invoking npm.
    const f = i.features || {};
    const needsNpm =
      f.js !== "none" ||
      f.husky === "on" ||
      existsSync(path.join(dir, "package.json"));
    if (needsNpm && typeof runners.npmInstall === "function") {
      const r = await safeRunner(() =>
        runners.npmInstall(dir, {
          verbose: postRunOptions.verbose === true,
        }),
      );
      if (!r.ok && r.warning) warnings.push(r.warning);
    }
    // 6b. composer install — only if the project has a composer.json
    //     OR phpTest is 'phpunit' (the engine emits composer.json
    //     in that case).
    const needsComposer =
      f.phpTest === "phpunit" || existsSync(path.join(dir, "composer.json"));
    if (needsComposer && typeof runners.composerInstall === "function") {
      const r = await safeRunner(() =>
        runners.composerInstall(dir, {
          verbose: postRunOptions.verbose === true,
        }),
      );
      if (!r.ok && r.warning) warnings.push(r.warning);
    }
  }

  if (postRunOptions.git === true && typeof runners.gitInit === "function") {
    const r = await safeRunner(() =>
      runners.gitInit(dir, { verbose: postRunOptions.verbose === true }),
    );
    if (!r.ok && r.warning) warnings.push(r.warning);
  }

  return {
    ok: true,
    written,
    manifestPath,
    warnings,
  };
}

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Run a runner and translate its result into a uniform
 * `{ok, warning}` shape. A runner that throws is caught here;
 * the run never aborts.
 */
async function safeRunner(fn) {
  try {
    const r = await fn();
    if (r && r.ok === true) {
      return { ok: true };
    }
    if (r && r.skipped) {
      return { ok: false, warning: r.reason || "skipped" };
    }
    if (r && r.ok === false) {
      return { ok: false, warning: r.error || "runner failed" };
    }
    return { ok: false, warning: "runner returned no result" };
  } catch (e) {
    return {
      ok: false,
      warning: "runner threw: " + (e && e.message ? e.message : String(e)),
    };
  }
}
