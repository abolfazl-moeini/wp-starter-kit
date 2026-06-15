/**
 * @wpsk/create-wp-project — `getKitStatus` kit/project info.
 *
 * Phase 24 of plan.v3.md (24.12, 24.13). The installer's
 * `wpsk info` command runs this function. It is the
 * "tell me about this kit / project" surface — a thin
 * adapter over the manifest plus an optional registry
 * lookup.
 *
 * The contract:
 *
 *   getKitStatus(dir, { lookupLatest? }) → Promise<{
 *     ok: true,
 *     kitVersion,         // from the manifest
 *     distMode,           // from the manifest
 *     features,           // from the manifest
 *     path,               // absolute project path
 *     updateAvailable?,   // true iff lookupLatest resolves to
 *                        // a NEWER version than kitVersion
 *     latestKitVersion?,  // the version lookupLatest returned
 *   }>
 *
 * Async, even when no `lookupLatest` is provided, because
 * the production `lookupLatest` (CLI I5) is async (it hits
 * the npm registry). The default lookup is `async () => null`
 * — it resolves to `null` on the next tick. Tests can
 * `await` either way without branching.
 *
 * Why an injected `lookupLatest`?
 *  - The engine shouldn't depend on the npm registry.
 *  - The CLI can pass a real lookup that hits the registry;
 *    the engine can be tested with a fake.
 *  - A future "offline mode" can pass a `lookupLatest` that
 *    reads a local cache file.
 *
 * Manifest is read with `readManifest()` (sync). We use a
 * sync read because the function is already async (it
 * returns a Promise); making the manifest read sync avoids
 * the dual-async stack. A future "remote manifest" feature
 * would push the async surface to the top.
 *
 * Numeric semver comparison (the "0.9.0 < 0.10.0" property)
 * is the load-bearing guarantee of the `updateAvailable`
 * computation. The kit's own versions are X.Y.Z; a string
 * sort would put "0.10.0" BEFORE "0.9.0" because "1" < "9",
 * and updateAvailable would silently lie. The test
 * "comparison is numeric semver" locks this property.
 */

import { readManifest } from "./manifest.js";
import * as path from "node:path";

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

/**
 * Default `lookupLatest` — a noop that resolves to `null`.
 * Tests inject their own fakes; the production CLI I5 will
 * inject a real one that hits the npm registry. The engine
 * never assumes a registry call is available.
 *
 * @returns {Promise<string|null>}
 */
async function defaultLookupLatest() {
  return null;
}

/**
 * Compare two semver strings numerically. Returns:
 *   negative if a < b,
 *   zero     if a === b,
 *   positive if a > b.
 *
 * Mirrors the helpers in `migrations/index.js`,
 * `plan-update.js`, and `doctor.js`. The duplication is
 * intentional: each module keeps its own compare so the
 * dependency graph stays small (no shared "semver util" file
 * for what's a 10-line function).
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareSemver(a, b) {
  const aParts = String(a)
    .split(".")
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
  const bParts = String(b)
    .split(".")
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

/* -------------------------------------------------------------------- */
/* getKitStatus                                                            */
/* -------------------------------------------------------------------- */

/**
 * Return the kit/project status. NEVER throws; a missing
 * manifest is a `{ok:false, reason}` so the CLI can show
 * the user a clean "not a wpsk project" message.
 *
 * The function awaits `lookupLatest` only if it was
 * provided. With the default (noop), the await is a single
 * microtask tick.
 *
 * @param {string} dir
 * @param {Object} [opts]
 * @param {(currentVersion: string) => Promise<string|null>} [opts.lookupLatest]
 *   Optional registry lookup. The default resolves to
 *   `null` (no update information). The function receives
 *   the project's `kitVersion` so a real lookup can ask
 *   "is there anything newer than this?" without re-reading
 *   the manifest.
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
export async function getKitStatus(dir, opts = {}) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "dir is required (string)" };
  }

  // 1. Read the manifest. Missing → {ok:false, reason}.
  //    Malformed JSON → we still return {ok:false}; the
  //    installer's "broken manifest" UX is "show the user
  //    the path + parser message", but at the engine level
  //    a parse error is also a "not a usable project" and
  //    the CLI can show a more detailed error from
  //    readManifest's throw. We re-throw here and let the
  //    caller catch — no silent failure.
  let manifest;
  try {
    manifest = readManifest(dir);
  } catch (error) {
    return {
      ok: false,
      reason: `manifest unreadable: ${error && error.message ? error.message : String(error)}`,
    };
  }
  if (!manifest) {
    return { ok: false, reason: "no manifest at " + dir };
  }

  // 2. Compute the base shape. These four fields are
  //    ALWAYS present in the success result; the two
  //    updateAvailable* fields are conditional on the
  //    lookup resolving to a string.
  const result = {
    ok: true,
    kitVersion: manifest.kitVersion,
    distMode: manifest.distMode,
    features: manifest.features || {},
    path: path.resolve(dir),
  };

  // 3. Optional registry lookup. The injection is async
  //    even when it returns null, so we always await it.
  const lookup =
    typeof opts.lookupLatest === "function"
      ? opts.lookupLatest
      : defaultLookupLatest;
  let latest = null;
  try {
    latest = await lookup(result.kitVersion);
  } catch {
    // A throwing lookup is treated like "no data" — we
    // don't fail the whole status call just because the
    // registry was unreachable. The CLI can re-run with
    // an offline flag later.
    latest = null;
  }
  if (typeof latest === "string" && latest.length > 0) {
    result.latestKitVersion = latest;
    // updateAvailable is true iff `latest` > `kitVersion`
    // numerically. A `latest === kitVersion` is "you are
    // current" (false). A `latest < kitVersion` is "the
    // registry is older than your project" — not an
    // updateAvailable signal, but still a "current"
    // result.
    result.updateAvailable = compareSemver(latest, result.kitVersion) > 0;
  }

  return result;
}
