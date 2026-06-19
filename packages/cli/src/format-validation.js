import { humanizeValidationErrors } from "./ui.js";

const CONFIG_ONLY_IDS = new Set([
  "phpMinVersion",
  "wpMinVersion",
  "license",
  "ci",
]);

/**
 * @param {string} reason
 * @param {Array<{id: string, label?: string}>} catalog
 * @returns {{ humanized: string, raw?: string }|null}
 */
export function formatValidationReason(reason, catalog) {
  if (typeof reason !== "string") return null;
  const m = /^invalid feature set: ([^=]+)=(.+)$/.exec(reason);
  if (!m) return null;
  const featureId = m[1];
  let msg = m[2];
  try {
    msg = JSON.parse(msg);
  } catch {
    // keep string
  }
  const { errors } = humanizeValidationErrors(
    { errors: { [featureId]: String(msg) }, warnings: {} },
    catalog,
  );
  return {
    humanized: errors[0] || reason,
    raw: String(msg),
  };
}

/**
 * @param {string} reason
 * @param {Array<{id: string, label?: string}>} catalog
 * @param {{ verbose?: boolean, key?: string }} [opts]
 * @returns {string[]}
 */
export function buildValidationOutputLines(reason, catalog, opts = {}) {
  const formatted = formatValidationReason(reason, catalog);
  if (!formatted) return [reason];

  const lines = [formatted.humanized];
  if (opts.verbose === true && formatted.raw) {
    lines.push(`  (${formatted.raw})`);
  }
  if (opts.key && CONFIG_ONLY_IDS.has(opts.key)) {
    lines.push("See: wpdev set --help for configurable features.");
  }
  return lines;
}
