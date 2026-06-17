/**
 * I7.6 — version sync helper.
 *
 * Single source of truth: `@wpdev/create-wp-project`'s
 * `package.json` `version` field. The CLI is a thin dispatcher
 * (subcommand parser + UX layer); the engine is the real
 * product. Two separate package versions drift apart over
 * time, so the CLI reads the engine's version at runtime
 * rather than maintaining its own copy.
 *
 * Resolution order (first non-empty wins):
 *   1. `override` argument (explicit test seam).
 *   2. `WPDEV_CLI_KIT_VERSION_OVERRIDE` env var (CI / test seam).
 *   3. Read the engine's on-disk `package.json` from the
 *      kit's workspace layout (`cwd()/packages/create-wp-project/package.json`).
 *   4. Fall back to `"0.0.0"` so `wpsk --version` still prints
 *      something useful when the engine package is missing
 *      (e.g. partial install in a downstream project).
 *
 * The function is defensive: it never throws. A missing or
 * malformed `package.json` is treated as "no version" and
 * triggers the next fallback.
 *
 * The env var name is exposed as a named constant for tests
 * (`WPDEV_CLI_KIT_VERSION_OVERRIDE`) and stable for downstream
 * tooling that wants to pin the reported version.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const KIT_VERSION_OVERRIDE_ENV = "WPDEV_CLI_KIT_VERSION_OVERRIDE";

/**
 * Resolve the canonical engine package.json path. The kit
 * ships a fixed workspace layout — the engine package lives
 * at `packages/create-wp-project/package.json` from the kit
 * root — so the helper is a thin `path.join`. We expose it
 * for the test suite so tests can assert the path shape (or
 * override the resolution by mocking `process.cwd`).
 *
 * @param {string} [cwd=process.cwd()]
 * @returns {string} the absolute path the helper would read.
 *   The function does NOT probe the filesystem — callers that
 *   need a "real-or-default" answer (e.g. the version resolver
 *   below) use `existsSync` themselves.
 */
export function resolveEnginePackageJsonPath(cwd = process.cwd()) {
  return join(cwd, "packages/create-wp-project/package.json");
}

/**
 * @param {object} [opts]
 * @param {string} [opts.override]  explicit version override
 *                                   (test / script seam). Wins
 *                                   over the env var and the
 *                                   on-disk read.
 * @returns {string} the resolved kit version (never throws)
 */
export function getKitVersion(opts = {}) {
  // 1. Explicit override argument (test seam).
  if (opts && typeof opts.override === "string" && opts.override.length > 0) {
    return opts.override;
  }

  // 2. Env var override (CI / test seam). `process.env` access
  //    is wrapped because some sandboxed runtimes do not
  //    expose it.
  let envVal = "";
  try {
    envVal = process.env?.[KIT_VERSION_OVERRIDE_ENV] || "";
  } catch {
    envVal = "";
  }
  if (typeof envVal === "string" && envVal.length > 0) {
    return envVal;
  }

  // 3. On-disk read of the engine's package.json (single
  //    source of truth). Defensive: missing file, JSON parse
  //    error, missing/invalid `version` field all fall through
  //    to the literal "0.0.0" sentinel.
  try {
    const pkgPath = resolveEnginePackageJsonPath();
    if (existsSync(pkgPath)) {
      const raw = readFileSync(pkgPath, "utf8");
      const pkg = JSON.parse(raw);
      if (typeof pkg.version === "string" && pkg.version.length > 0) {
        return pkg.version;
      }
    }
  } catch {
    /* fall through */
  }

  // 4. Sentinel — better than throwing from a `--version`
  //    call.
  return "0.0.0";
}
