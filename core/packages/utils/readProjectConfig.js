import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getRootPath } from "./path.js";

const REQUIRED_FIELDS = [
  "slug",
  "globalName",
  "localizeVar",
  "textDomain",
  "hookPrefix",
  "npmScope",
];

const OPTIONAL_DEFAULTS = {
  phpFunctionPrefix: "wpsk_",
  uiFramework: "preact",
  // Phase 14 v2 fields — sensible defaults so consumers (REST router,
  // Strauss release pipeline, fetch batch client) can rely on the keys
  // without a follow-up migration step. Override per-project by passing
  // a non-default value through project.config.json.
  restNamespace: "wpsk/v1",
  vendorPrefix: "WpskVendor",
  phpMinVersion: "7.4",
  phpSourceVersion: "8.1",
  batchEndpoint: "/batch/v1",
};

/**
 * Validate a value for a given Phase 14 v2 field. Throw a descriptive
 * error when invalid so config authors see the problem immediately.
 *
 * @param {string} field   Field name (e.g. 'vendorPrefix').
 * @param {unknown} value  Value to validate.
 */
function validateV2(field, value) {
  if (value === undefined || value === null) {
    // Optional fields — undefined falls back to defaults.
    return;
  }
  if (typeof value !== "string") {
    throw new Error(
      `project.config.json ${field} must be a string (got: ${typeof value})`,
    );
  }
  switch (field) {
    case "vendorPrefix":
      // Must be a valid PHP namespace segment: starts with [A-Z], then
      // [A-Za-z0-9_]* — used as the root namespace prefix for the
      // Strauss-scoped vendor.
      if (!/^[A-Z][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(
          `project.config.json vendorPrefix must start with an uppercase ` +
            `letter and contain only [A-Za-z0-9_] (got: "${value}")`,
        );
      }
      return;
    case "restNamespace":
      // WordPress namespace = `<vendor>/<segment>`. Reject whitespace,
      // brackets, anything but a single forward-slash separator.
      if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error(
          `project.config.json restNamespace must look like "vendor/v1" ` +
            `(letters, digits, dashes, underscores, one slash) (got: "${value}")`,
        );
      }
      return;
    case "phpMinVersion":
    case "phpSourceVersion":
      if (!/^\d+\.\d+(\.\d+)?$/.test(value)) {
        throw new Error(
          `project.config.json ${field} must look like "X.Y" or "X.Y.Z" (got: "${value}")`,
        );
      }
      return;
    case "batchEndpoint":
      if (!value.startsWith("/")) {
        throw new Error(
          `project.config.json batchEndpoint must start with "/" (got: "${value}")`,
        );
      }
      return;
    default:
      return;
  }
}

export function readProjectConfig(options = {}) {
  const configPath = options.path || join(getRootPath(), "project.config.json");

  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`project.config.json not found at: ${configPath}`);
    }
    throw new Error(`Failed to read project.config.json: ${error.message}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    throw new Error(
      `project.config.json is malformed or invalid JSON at: ${configPath}`,
    );
  }

  if (!config || typeof config !== "object") {
    throw new Error("project.config.json must contain a JSON object");
  }

  const missing = REQUIRED_FIELDS.filter((f) => !config[f]);
  if (missing.length) {
    throw new Error(
      `project.config.json missing required fields: ${missing.join(", ")}. ` +
        `Required: ${REQUIRED_FIELDS.join(", ")}`,
    );
  }

  const defaults = {
    ...OPTIONAL_DEFAULTS,
    depsBundle: `${config.slug}-deps.js`,
  };

  const merged = { ...defaults, ...config };

  if (!["preact", "react"].includes(merged.uiFramework)) {
    throw new Error(
      `project.config.json uiFramework must be "preact" or "react" (got: ${merged.uiFramework})`,
    );
  }

  // Phase 14.1-14.2: validate every v2 field that's present in the
  // config (defaults skip validation because they're known-safe).
  for (const field of [
    "restNamespace",
    "vendorPrefix",
    "phpMinVersion",
    "phpSourceVersion",
    "batchEndpoint",
  ]) {
    if (config[field] !== undefined) {
      validateV2(field, config[field]);
    }
  }

  return merged;
}
