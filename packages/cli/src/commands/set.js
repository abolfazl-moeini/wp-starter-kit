import { buildValidationOutputLines } from "../format-validation.js";

/**
 * `wpdev set <key> <value>` — set a config-only feature variant.
 *
 * Phase 3 (plan.final.md P3-T1). Config-only features (phpMinVersion,
 * wpMinVersion, license, ci) are changed here; toggle features use
 * `wpdev add` / `wpdev remove`.
 */

/**
 * @typedef {Object} SetInput
 * @property {string} dir
 * @property {string} key
 * @property {string} value
 */

/**
 * @typedef {Object} SetDeps
 * @property {Object} engine  { setConfigValue, isConfigSettable, getFeatureCatalog }
 */

/**
 * @param {SetInput} input
 * @param {SetDeps} [deps]
 * @returns {Promise<{ ok: boolean, reason?: string, written?: string[]|false }>}
 */
export async function runSet(input, deps = {}) {
  const i = input || {};
  const engine = deps.engine;

  if (!i.dir || typeof i.dir !== "string") {
    return { ok: false, reason: "runSet: dir is required" };
  }
  if (!i.key || typeof i.key !== "string") {
    return { ok: false, reason: "runSet: key is required" };
  }
  if (!i.value || typeof i.value !== "string") {
    return { ok: false, reason: "runSet: value is required" };
  }
  if (!engine || typeof engine.setConfigValue !== "function") {
    return {
      ok: false,
      reason: "runSet: deps.engine.setConfigValue is required",
    };
  }

  const isSettable =
    typeof engine.isConfigSettable === "function"
      ? engine.isConfigSettable(i.key)
      : false;
  if (!isSettable) {
    const catalog =
      typeof engine.getFeatureCatalog === "function"
        ? engine.getFeatureCatalog()
        : [];
    const known = catalog.some((f) => f.id === i.key);
    if (known) {
      return {
        ok: false,
        reason: `runSet: "${i.key}" is not config-only; use 'wpdev add ${i.key}' instead`,
      };
    }
    return {
      ok: false,
      reason: `runSet: "${i.key}" is not a known feature id`,
    };
  }

  let result;
  try {
    result = await engine.setConfigValue(i.dir, i.key, i.value);
  } catch (e) {
    return {
      ok: false,
      reason:
        "engine.setConfigValue threw: " +
        (e && e.message ? e.message : String(e)),
    };
  }

  if (!result || result.ok !== true) {
    const rawReason =
      (result && result.reason) || "engine.setConfigValue failed";
    const catalog =
      typeof engine.getFeatureCatalog === "function"
        ? engine.getFeatureCatalog()
        : [];
    const lines = buildValidationOutputLines(rawReason, catalog, {
      key: i.key,
    });
    return {
      ok: false,
      reason: lines.join("\n"),
      rawReason,
    };
  }

  return {
    ok: true,
    written: result.written,
  };
}
