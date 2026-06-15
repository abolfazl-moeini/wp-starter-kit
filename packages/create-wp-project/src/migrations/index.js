/**
 * @wpsk/create-wp-project — migration registry + selector + runner.
 *
 * Phase 24 of plan.v3.md. The engine's "update consumer project
 * from kit version A to version B" surface. Powers the
 * installer's `wpsk update` command (Phase 24 is engine-only;
 * the CLI surfaces land in a sibling task).
 *
 * Public exports (this file):
 *   - getMigrations()      the sorted, registered migration list
 *   - selectMigrations(from, to)   range selection by semver
 *   - runMigrations(dir, opts)     sequential, atomic runner
 *
 * A migration is a module under `src/migrations/<version>.js`
 * exporting `{ version, description, run(dir) }`. The
 * registry loads them via a single explicit import map (not
 * `fs.readdir`) so the bundle stays tree-shakable and the
 * dependency graph is visible from this file. New migrations
 * are added in two places:
 *
 *   1. Create `src/migrations/<version>.js` with the descriptor.
 *   2. Add the import + push below.
 *
 * This is the same pattern the generator registry uses
 * (src/generators/index.js). It scales fine through Phase 24's
 * expected migration count (a handful per release); if the
 * count ever grows past a few dozen, replace the static
 * import map with a `fs.readdir` + dynamic import — but keep
 * the explicit form for now because it makes dead-code
 * detection and IDE navigation trivial.
 *
 * All public APIs are pure / fail-soft:
 *  - getMigrations() never throws.
 *  - selectMigrations() throws on `to < from` (caller bug).
 *  - runMigrations() returns `{ok:false, reason}` on I/O
 *    errors so the installer's "show the user what went wrong"
 *    flow can format a human message.
 */

import { existsSync, readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";

import {
  readManifest,
  MANIFEST_FILENAME,
  writeManifest,
  buildManifest,
} from "../manifest.js";
import { updateJsonFile } from "../json-utils.js";

import * as migration_0_2_0 from "./0.2.0.js";

/* -------------------------------------------------------------------- */
/* Migration catalog                                                     */
/* -------------------------------------------------------------------- */

/**
 * Every registered migration. Order in this array does NOT
 * matter — `getMigrations()` sorts by semver ascending before
 * returning. Order here exists for human readability (oldest
 * at the top) and as a checklist ("did you add the new one?").
 */
const MIGRATIONS = [migration_0_2_0];

/**
 * Return the registered migrations sorted ASCENDING by semver
 * (numeric, not lexicographic — "0.9.0" < "0.10.0").
 *
 * The test suite asserts this order; `runMigrations` relies on
 * it (migrations are applied in array order, which is the only
 * safe order to apply them).
 *
 * @returns {Array<{version: string, description: string, run: (dir: string) => Promise<any>}>}
 */
export function getMigrations() {
  return [...MIGRATIONS].sort((a, b) => compareSemver(a.version, b.version));
}

/* -------------------------------------------------------------------- */
/* semver compare                                                         */
/* -------------------------------------------------------------------- */

/**
 * Compare two semver strings. Returns:
 *   negative if a < b,
 *   zero     if a === b,
 *   positive if a > b.
 *
 * Implements the strict numeric major.minor.patch comparison
 * (no prerelease, no build-metadata). This is intentionally
 * minimal — wp-starter-kit versions follow X.Y.Z with all
 * numeric parts, so a real `semver` dep is overkill. The
 * implementation MUST stay numeric; a "0.9.0" < "0.10.0"
 * ordering is the whole point of the test in
 * migrations.select.test.js.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function compareSemver(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    throw new Error(
      `compareSemver: both arguments must be strings (got ${typeof a}, ${typeof b})`,
    );
  }
  const aParts = a.split(".").map((n) => parseInt(n, 10));
  const bParts = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const av = aParts[i] || 0;
    const bv = bParts[i] || 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/* -------------------------------------------------------------------- */
/* Version range selection                                                */
/* -------------------------------------------------------------------- */

/**
 * Select the migrations whose `version` falls strictly inside
 * the range `(from, to]`:
 *
 *   selectMigrations("0.1.0", "0.3.0")  →  [0.2.0]
 *   selectMigrations("0.2.0", "0.2.0")  →  []  (already at target)
 *   selectMigrations("0.1.0", "0.10.0") →  [0.2.0, 0.9.0, 0.10.0]
 *
 * Returns an empty array when `to <= from` (the project is
 * already at or past the target — the run is a no-op, which
 * `runMigrations` reports as `alreadyCurrent`).
 *
 * Throws a clear Error if `to < from` (the caller has a
 * version-range bug — the engine refuses to silently return
 * an empty list, which would mask a "downgrade" attempt).
 *
 * @param {string} from
 * @param {string} to
 * @returns {Array<{version: string, description: string, run: Function}>}
 */
export function selectMigrations(from, to) {
  if (typeof from !== "string" || typeof to !== "string") {
    throw new Error(
      `selectMigrations: from and to must be strings (got ${typeof from}, ${typeof to})`,
    );
  }
  if (compareSemver(to, from) < 0) {
    throw new Error(
      `selectMigrations: to (${to}) is older than from (${from}) — refusing to "downgrade"`,
    );
  }
  // Empty when to === from: `0 < v <= 0` matches nothing.
  if (compareSemver(to, from) === 0) {
    return [];
  }
  return getMigrations().filter((m) => {
    return (
      compareSemver(from, m.version) < 0 && compareSemver(m.version, to) <= 0
    );
  });
}

/* -------------------------------------------------------------------- */
/* runMigrations                                                          */
/* -------------------------------------------------------------------- */

const PROJECT_CONFIG_FILENAME = "project.config.json";

/**
 * Apply every migration in `(from, to]` to a project rooted at
 * `dir`, then atomically bump the manifest's `kitVersion` to
 * `to` (and `project.config.json`'s `kitVersion`, if present).
 *
 * Atomicity rule (per plan.v3.md §24): if any migration throws
 * OR returns `{ok:false}`, the run halts at THAT migration and
 * the manifest is NOT bumped. Half-applied migrations are a
 * known limitation; the recommended recovery is `git checkout .`
 * (see plan.v3.md §24 rollback policy). The runner reports
 * `failedAt` so the user knows which migration to investigate.
 *
 * Idempotency: if the manifest's `kitVersion` is already `>= to`,
 * the runner returns `{ok:true, alreadyCurrent:true, ran:[]}`
 * WITHOUT running any migration. The first call bumps and the
 * second call is a no-op.
 *
 * Pre-conditions checked in order:
 *   1. `wpsk-kit.json` exists at `dir` (else
 *      `{ok:false, reason:"no manifest"}`).
 *   2. The manifest's `kitVersion` is < `to` (else already-current).
 *
 * @param {string} dir
 * @param {Object} opts
 * @param {string} opts.from   the project's current `kitVersion`
 *                              (caller may pass it explicitly
 *                              for dry-runs, or omit and the
 *                              runner reads the manifest)
 * @param {string} opts.to     the target `kitVersion`
 * @returns {Promise<{
 *   ok: boolean,
 *   ran?: string[],
 *   from?: string,
 *   to?: string,
 *   alreadyCurrent?: boolean,
 *   failedAt?: string,
 *   reason?: string,
 * }>}
 */
export async function runMigrations(dir, { from, to } = {}) {
  if (!dir || typeof dir !== "string") {
    throw new Error("runMigrations: dir is required (string)");
  }
  if (!to || typeof to !== "string") {
    throw new Error("runMigrations: opts.to is required (semver string)");
  }

  // 1. Manifest must exist.
  const manifest = readManifest(dir);
  if (!manifest) {
    return {
      ok: false,
      reason: "no manifest",
    };
  }

  // 2. Effective `from` defaults to the manifest's current version.
  //    If the caller passed `from` explicitly, prefer it (lets the
  //    installer dry-run a hypothetical range).
  const effectiveFrom = from || manifest.kitVersion;
  if (typeof effectiveFrom !== "string") {
    return {
      ok: false,
      reason: `manifest at ${dir} has no kitVersion; cannot determine starting point`,
    };
  }

  // 3. Already at or past the target — no-op.
  if (compareSemver(effectiveFrom, to) >= 0) {
    return {
      ok: true,
      ran: [],
      from: effectiveFrom,
      to,
      alreadyCurrent: true,
    };
  }

  // 4. Validate the range.
  if (compareSemver(to, effectiveFrom) < 0) {
    return {
      ok: false,
      reason: `runMigrations: to (${to}) is older than from (${effectiveFrom}) — refusing to "downgrade"`,
    };
  }

  // 5. Select the migrations to run.
  const toRun = selectMigrations(effectiveFrom, to);

  // 6. Apply them sequentially. On any throw or {ok:false}, halt
  //    and report the failed version. The manifest is NOT bumped
  //    in this case.
  for (const m of toRun) {
    let result;
    try {
      result = await m.run(dir);
    } catch (error) {
      return {
        ok: false,
        failedAt: m.version,
        reason: error && error.message ? error.message : String(error),
        from: effectiveFrom,
        to,
      };
    }
    if (result && result.ok === false) {
      return {
        ok: false,
        failedAt: m.version,
        reason: result.reason || "migration returned ok:false",
        from: effectiveFrom,
        to,
      };
    }
    // result is either undefined (migration returned nothing —
    // we treat that as success) or {ok:true} / any truthy.
  }

  // 7. All migrations succeeded — bump the manifest's kitVersion.
  //    We rebuild the manifest to preserve the existing shape
  //    (features, distMode) and only swap kitVersion + generatedAt.
  const nextManifest = buildManifest({
    kitVersion: to,
    features: manifest.features || {},
    distMode: manifest.distMode || "vendored",
    generatedAt: new Date().toISOString(),
  });
  await writeManifest(dir, nextManifest);

  // 8. Mirror the kitVersion into project.config.json if it
  //    exists. The manifest is the source of truth; the mirror
  //    is for pre-Phase 20 readers (the kit's PHP classes, the
  //    JS asset bundle) that haven't discovered wpsk-kit.json.
  //    We use `updateJsonFile` so the file's existing indent
  //    and trailing-newline state are preserved.
  const cfgPath = path.join(dir, PROJECT_CONFIG_FILENAME);
  if (existsSync(cfgPath)) {
    try {
      await updateJsonFile(cfgPath, (cfg) => {
        if (cfg && typeof cfg === "object") {
          cfg.kitVersion = to;
        }
        return cfg;
      });
    } catch (error) {
      // project.config.json is a mirror, not a source of truth.
      // A failure here is reported but does NOT roll back the
      // manifest bump — the consumer's durable state is the
      // manifest. The error is included in the response so the
      // caller (CLI) can warn the user.
      return {
        ok: true,
        ran: toRun.map((m) => m.version),
        from: effectiveFrom,
        to,
        warning: `manifest updated, but project.config.json mirror failed: ${error.message}`,
      };
    }
  }

  return {
    ok: true,
    ran: toRun.map((m) => m.version),
    from: effectiveFrom,
    to,
  };
}
