/**
 * @wpdev/create-wp-project — `planUpdate` dry-run planner.
 *
 * Phase 24 of plan.v3.md (24.7, 24.8). The installer runs
 * `wpdev update` in two phases:
 *
 *   1. `wpdev update` (default) — calls `planUpdate(dir, toVersion)`
 *      and PRINTS the plan. No disk writes. The user reads
 *      the plan and decides whether to apply.
 *   2. `wpdev update --run` — calls `runMigrations(dir, ...)`
 *      to actually apply the plan (and bump the manifest).
 *
 * The plan is a plain JSON-serializable object. Its shape:
 *
 *   {
 *     ok: true,
 *     from: "0.1.0",            // current kitVersion
 *     to: "0.2.0",              // requested
 *     migrations: [             // what would run
 *       { version, description }
 *     ],
 *     depChanges: {             // package.json + composer.json diffs
 *       package: { add: {}, remove: {}, bump: {} },
 *       composer: { add: {}, remove: {}, bump: {} }
 *     }
 *   }
 *
 * Edge cases (mirror the test contracts in
 * `tests/packages/update.plan.test.js`):
 *
 *  - `to <= from` → `{ok:true, noop:true, current: toVersion}`.
 *    The contract: when the project is already at or past the
 *    target, the plan is a no-op (no migrations, no dep
 *    changes). The "from < to" is the canonical "needs update"
 *    case; "from > to" is a "downgrade" request and the
 *    plan is also a no-op (the installer's full update flow
 *    surfaces the downgrade attempt with a stronger error).
 *
 *  - Manifest missing → `{ok:false, reason: "no manifest"}`.
 *    The CLI shows the user a clear "this isn't a wpdev
 *    project" message.
 *
 *  - `package.json` and/or `composer.json` missing → the
 *    plan still returns a valid shape. Deps the registry
 *    knows about are reported as `add` (the consumer doesn't
 *    have them). This covers a PHP-only project that has no
 *    `package.json` (e.g. `js: "none"`) — the dry-run must
 *    not crash.
 *
 * NO DISK WRITES. The function is pure with respect to the
 * project directory: it reads the manifest, the package.json
 * (if present), and the composer.json (if present), and
 * returns the plan. The CLI's `--run` flow is the only
 * writer. This is the load-bearing property of the dry-run
 * step — the user reads the plan first, applies second.
 *
 * Comparison rules for the dep diff:
 *
 *  - A dep the registry knows and the project has, with the
 *    SAME range string → no change.
 *  - A dep the registry knows and the project has, with a
 *    DIFFERENT range → recorded in `bump[depName] = { from,
 *    to }` (the new range comes from the registry). The bump
 *    form is preferred over a remove+add pair so the CLI can
 *    show a single "X bumped from A to B" line.
 *  - A dep ONLY in the registry (project has nothing) →
 *    `add[depName] = <new range>`.
 *  - A dep ONLY in the project (registry doesn't ship it) →
 *    `remove[depName] = <old range>`. We don't drop the range
 *    on remove — the user may want to see what was removed.
 *
 * Range comparison is exact-string. A future "loose" mode
 * (e.g. "^5.0.0" matches "^5.6.0" because they overlap) is a
 * feature request, not a default.
 */

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

import { readManifest } from "./manifest.js";
import { getDepVersions } from "./dep-versions.js";
import { selectMigrations } from "./migrations/index.js";

/* -------------------------------------------------------------------- */
/* Constants                                                             */
/* -------------------------------------------------------------------- */

const PACKAGE_JSON_FILENAME = "package.json";
const COMPOSER_JSON_FILENAME = "composer.json";

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Safely read + parse a JSON file. Returns `null` when the
 * file is absent (this is the "PHP-only project with no
 * package.json" case) and throws on malformed JSON so a
 * user-broken file isn't silently treated as empty.
 *
 * @param {string} filePath
 * @returns {object|null}
 */
function readJsonOrNull(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `planUpdate: malformed JSON in ${filePath} (${error.message})`,
    );
  }
}

/**
 * Compute the dep diff between a project's installed deps
 * (an object like `{ "typescript": "^5.0.0", ... }`) and
 * the kit's registry (a `Map<name, range>`).
 *
 * Returns `{ add, remove, bump }` where:
 *
 *  - `add[dep]`     = new range; dep is in registry but
 *                     missing from the project.
 *  - `remove[dep]`  = old range; dep is in project but not
 *                     in registry.
 *  - `bump[dep]`    = { from, to }; dep is in both, range
 *                     differs.
 *
 * @param {Object|null} projectDeps  the project's installed deps
 * @param {Map<string,string>} registry  the kit's dep registry
 * @returns {{ add: Object, remove: Object, bump: Object }}
 */
function diffDeps(projectDeps, registry) {
  const add = {};
  const remove = {};
  const bump = {};
  const project =
    projectDeps && typeof projectDeps === "object" ? projectDeps : {};

  // Walk the registry: every entry is either a no-op (same
  // range), a bump (different range), or an add (missing
  // from project). Order doesn't matter — the CLI pretty-
  // prints alphabetically.
  for (const [name, range] of registry) {
    if (!(name in project)) {
      add[name] = range;
    } else if (project[name] !== range) {
      bump[name] = { from: project[name], to: range };
    }
    // else: same range, nothing to do
  }

  // Walk the project: every dep NOT in the registry is a
  // remove candidate. We keep the old range so the user can
  // see "this dep is no longer in the kit's toolchain".
  for (const name of Object.keys(project)) {
    if (!registry.has(name)) {
      remove[name] = project[name];
    }
  }

  return { add, remove, bump };
}

/**
 * Build the depChanges object for the plan: package + composer
 * sides, each with `{ add, remove, bump }`. Files that don't
 * exist contribute an empty `projectDeps` (so every registry
 * entry shows up as `add`).
 *
 * @param {string} dir
 * @returns {{
 *   package: { add: Object, remove: Object, bump: Object },
 *   composer: { add: Object, remove: Object, bump: Object }
 * }}
 */
function computeDepChanges(dir) {
  const registry = getDepVersions();

  const pkg = readJsonOrNull(path.join(dir, PACKAGE_JSON_FILENAME));
  // npm's `dependencies` and `devDependencies` are BOTH
  // considered installed deps for the diff — the registry
  // doesn't distinguish. A consumer with a dep in
  // devDependencies that the registry lists in
  // dependencies (or vice-versa) is reported as "same",
  // because the file is the same in both positions. This
  // is intentional; the bump step is a "set range" op, not
  // a "move to devDeps" op.
  const pkgDeps = pkg
    ? {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      }
    : null;

  const composer = readJsonOrNull(path.join(dir, COMPOSER_JSON_FILENAME));
  // Composer splits require / require-dev. Same flat merge
  // rationale as package.json above.
  const composerDeps = composer
    ? {
        ...(composer.require || {}),
        ...(composer["require-dev"] || {}),
      }
    : null;

  return {
    package: diffDeps(pkgDeps, registry),
    composer: diffDeps(composerDeps, registry),
  };
}

/* -------------------------------------------------------------------- */
/* planUpdate                                                            */
/* -------------------------------------------------------------------- */

/* -------------------------------------------------------------------- */
/* planUpdate                                                            */
/* -------------------------------------------------------------------- */

/**
 * Build the update plan for a project rooted at `dir`. NEVER
 * writes to disk. The caller is responsible for any user-
 * facing formatting or persistence.
 *
 * @param {string} dir
 * @param {string} toVersion
 * @returns {{
 *   ok: boolean,
 *   from?: string,
 *   to?: string,
 *   current?: string,
 *   noop?: boolean,
 *   migrations?: Array<{version: string, description: string}>,
 *   depChanges?: {
 *     package: { add: Object, remove: Object, bump: Object },
 *     composer: { add: Object, remove: Object, bump: Object }
 *   },
 *   reason?: string
 * }}
 */
export function planUpdate(dir, toVersion) {
  if (!dir || typeof dir !== "string") {
    throw new Error("planUpdate: dir is required (string)");
  }
  if (!toVersion || typeof toVersion !== "string") {
    throw new Error("planUpdate: toVersion is required (semver string)");
  }

  // 1. Manifest is the source of truth. Missing → fail-soft
  //    (matches runMigrations' contract; the installer's CLI
  //    surfaces this as "not a wpdev project").
  const manifest = readManifest(dir);
  if (!manifest) {
    return { ok: false, reason: "no manifest" };
  }
  const from = manifest.kitVersion;
  if (typeof from !== "string" || from.length === 0) {
    return {
      ok: false,
      reason: `manifest at ${dir} has no kitVersion; cannot plan update`,
    };
  }

  // 2. No-op when to <= from. The "downgrade" case is a
  //    no-op too — the installer's full update flow does a
  //    stronger check (refuses to downgrade with a real
  //    error), but the dry-run step is a "what would change"
  //    report and the answer to "what would change to go
  //    backwards?" is "nothing". We MUST short-circuit
  //    BEFORE calling selectMigrations, which throws on
  //    downgrade — the planner is fail-soft.
  if (semverLte(toVersion, from)) {
    return {
      ok: true,
      noop: true,
      current: from,
      // Stable shape: callers can still destructure
      // `depChanges.package.add` without a guard.
      depChanges: {
        package: { add: {}, remove: {}, bump: {} },
        composer: { add: {}, remove: {}, bump: {} },
      },
      migrations: [],
    };
  }

  // 3. List the migrations that would run. We use the same
  //    selector runMigrations uses, so the dry-run and the
  //    run cannot disagree on the chain.
  const migrations = selectMigrations(from, toVersion).map((m) => ({
    version: m.version,
    description: m.description,
  }));

  // 4. Compute the dep diff. Files that don't exist
  //    contribute an empty dep set → the registry's entries
  //    all show up as `add`.
  const depChanges = computeDepChanges(dir);

  return {
    ok: true,
    from,
    to: toVersion,
    migrations,
    depChanges,
  };
}

/* -------------------------------------------------------------------- */
/* Local semver compare for the "to <= from" check                       */
/* -------------------------------------------------------------------- */
//
// We can't import `compareSemver` from `migrations/index.js`
// without re-exposing it; and we don't want this file to
// know the registry's internals. A local compare is fine:
// the only thing the planner needs is "is `to` >= `from`?",
// which is the same numeric semver rule the registry uses.

function semverLte(a, b) {
  return compareTriples(parseTriples(a), parseTriples(b)) <= 0;
}
function parseTriples(v) {
  return String(v)
    .split(".")
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
}
function compareTriples(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}
