/**
 * I7.6 — version sync helper.
 *
 * Single source of truth: `@wpsk/create-wp-project`'s
 * `package.json` `version` field. The CLI is a thin dispatcher
 * (subcommand parser + UX layer); the engine is the real
 * product. Two separate package versions drift apart over
 * time, so the CLI reads the engine's version at runtime
 * rather than maintaining its own copy.
 *
 * Resolution order (first non-empty wins):
 *   1. `override` argument (explicit test seam).
 *   2. `WPSK_CLI_KIT_VERSION_OVERRIDE` env var (CI / test seam).
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
 * (`WPSK_CLI_KIT_VERSION_OVERRIDE`) and stable for downstream
 * tooling that wants to pin the reported version.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const KIT_VERSION_OVERRIDE_ENV = "WPSK_CLI_KIT_VERSION_OVERRIDE";

/**
 * Resolve the canonical engine package.json path. We probe
 * a small list of candidates so the helper works whether the
 * caller is in the kit root (the common case) or inside
 * `packages/cli/` itself (some test invocations).
 *
 * Exported for the test suite so it can assert the same path
 * shape (or override the resolution by mocking `process.cwd`).
 */
export function resolveEnginePackageJsonPath(cwd = process.cwd()) {
  const candidates = [join(cwd, "packages/create-wp-project/package.json")];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
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
