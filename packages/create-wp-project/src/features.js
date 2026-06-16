/**
 * @wpsk/create-wp-project — feature catalog & validation
 *
 * Phase 20 of plan.v3.md. The catalog is the single source of truth
 * for every feature the installer + generators know about. The table
 * in plan.v3.md §1 is the contract; the manifests, presets, and
 * generators read this file.
 *
 * Two contracts:
 *  - getFeatureCatalog() — returns descriptors in the documented
 *    order; the first variant of every feature is the default.
 *  - defaultFeatures() — returns one entry per feature id with the
 *    default variant. A fresh object is returned on every call so
 *    callers can mutate without leaking into the next call.
 *  - validateFeatureSet(features) — returns { ok, errors } for the
 *    dependency rules in plan.v3.md §1.1. Pure function, no I/O.
 *
 * The set of feature ids is the union of `getFeatureCatalog()` rows
 * plus, by design, the §1 table — adding a new id here without
 * updating the plan is a contract change.
 */

/* -------------------------------------------------------------------- */
/* Feature catalog                                                       */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} FeatureDescriptor
 * @property {string} id           Stable feature id (matches plan §1).
 * @property {string[]} variants   Allowed variants. variants[0] is
 *                                the default — see plan §1 "first = default".
 * @property {string} default      Mirrors variants[0] for convenience.
 * @property {string} [notes]      Free-form description (informational).
 */

/** @type {FeatureDescriptor[]} */
const FEATURE_CATALOG = [
  {
    id: "js",
    variants: ["typescript", "pure", "flow", "none"],
    default: "typescript",
    notes: "JavaScript pipeline. `none` = PHP-only plugin.",
  },
  {
    id: "jsLib",
    variants: ["none", "preact", "react"],
    default: "none",
    notes: "UI library. Only meaningful when js ≠ none.",
  },
  {
    id: "jsTest",
    variants: ["jest", "vitest", "none"],
    default: "jest",
    notes: "JS unit testing tool. Only when js ≠ none.",
  },
  {
    id: "phpMinVersion",
    variants: ["7.4", "8.0", "8.1", "8.2", "8.3"],
    default: "7.4",
    notes: "Lowest PHP version to support (drives Rector downgrade).",
  },
  {
    id: "phpFramework",
    variants: ["none", "wpdev"],
    default: "none",
    notes: "Use wpdev-framework? `wpdev` adds an adapter + dependency.",
  },
  {
    id: "phpTest",
    variants: ["phpunit", "none"],
    default: "phpunit",
    notes: "PHP unit testing. PHPUnit on by default.",
  },
  {
    id: "restBatch",
    variants: ["off", "on"],
    default: "off",
    notes: "REST batch endpoint + @scope/fetch JS client.",
  },
  {
    id: "faultTolerance",
    variants: ["off", "on"],
    default: "off",
    notes: "PHP fault-tolerance package. Requires phpMinVersion ≥ 8.1.",
  },
  {
    id: "vendorScoping",
    variants: ["on", "off"],
    default: "on",
    notes: "Strauss vendor scoping on release.",
  },
  {
    id: "husky",
    variants: ["on", "off"],
    default: "on",
    notes: "Git pre-commit hooks via husky.",
  },
  {
    id: "css",
    variants: ["none", "sass", "tailwind", "postcss"],
    default: "none",
    notes: "CSS framework. Requires js ≠ none for the build pipeline.",
  },
  {
    id: "blocks",
    variants: ["off", "on"],
    default: "off",
    notes:
      "Gutenberg block support. Requires js ≠ none and wpMinVersion ≥ 5.8.",
  },
  {
    id: "license",
    variants: ["gpl2", "gpl3", "mit"],
    default: "gpl2",
    notes: "License. GPL-2.0-or-later, GPL-3.0-or-later, or MIT.",
  },
  {
    id: "wpMinVersion",
    variants: ["6.0", "5.8", "6.2", "6.4", "6.6"],
    default: "6.0",
    notes: "Minimum WordPress version. Drives `Requires at least` header.",
  },
  {
    id: "exampleFeature",
    variants: ["on", "off"],
    default: "on",
    notes: "Include the ExampleFeature demo module. Off = empty src/Modules/.",
  },
  {
    id: "i18n",
    variants: ["on", "off"],
    default: "on",
    notes: "Translation pipeline.",
  },
];

/**
 * Return the feature catalog (read-only). Order matches the
 * plan.v3.md §1 table. The first variant of every feature is the
 * default.
 *
 * @returns {FeatureDescriptor[]}
 */
export function getFeatureCatalog() {
  return FEATURE_CATALOG;
}

/**
 * Return the all-default feature set: a fresh `{ id: defaultVariant }`
 * object on every call so callers can mutate without leaking.
 *
 * @returns {Record<string, string>}
 */
export function defaultFeatures() {
  const out = {};
  for (const f of FEATURE_CATALOG) {
    out[f.id] = f.variants[0];
  }
  return out;
}

/* -------------------------------------------------------------------- */
/* Helpers used by validateFeatureSet                                    */
/* -------------------------------------------------------------------- */

/**
 * Compare two dotted PHP version strings (e.g. "8.0", "8.1", "7.4").
 * Returns negative if a < b, 0 if equal, positive if a > b. Anything
 * that doesn't match the X.Y or X.Y.Z shape sorts AFTER a valid
 * version, so a malformed `phpMinVersion` will be detected as
 * "greater than 8.1" and will mask the rule — the upstream
 * shape-check in validateFeatureSet catches that first.
 */
function comparePhpVersion(a, b) {
  const parse = (v) => {
    if (typeof v !== "string") return [Infinity];
    const parts = v.split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isNaN(n) ? -1 : n;
    });
    return parts;
  };
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/* -------------------------------------------------------------------- */
/* validateFeatureSet                                                    */
/* -------------------------------------------------------------------- */

/**
 * Validate a feature set against the rules in plan.v3.md §1.1.
 * Returns `{ ok, errors, warnings }`:
 *  - `errors` is a record of `{ featureId: humanMessage }` for hard
 *    violations. A feature may have multiple violations; the FIRST
 *    one is recorded (failing fast is more useful than enumerating
 *    every error the installer might want to fix).
 *  - `warnings` is a record of `{ featureId: humanMessage }` for
 *    ADVISORY-only issues. The set is still `ok: true` — the
 *    installer surfaces the warning in the UI but does not block.
 *    Phase 25.G2 introduces the first warning: `license=mit` on a
 *    WordPress project (WordPress.org requires GPL compatibility).
 *
 * @param {Record<string, string>|null|undefined} features
 * @returns {{ ok: boolean, errors: Record<string,string>, warnings: Record<string,string> }}
 */
export function validateFeatureSet(features) {
  const errors = {};
  const warnings = {};
  if (!features || typeof features !== "object") {
    return {
      ok: false,
      errors: { _root: "features must be an object" },
      warnings: {},
    };
  }

  // 0. Shape check — every catalog id must be present, and every
  //    value must be one of the catalog's allowed variants. We
  //    collect shape errors first because the dependency rules below
  //    assume a well-formed set.
  for (const f of FEATURE_CATALOG) {
    const v = features[f.id];
    if (v === undefined || v === null || v === "") {
      errors[f.id] = `${f.id} is required`;
      continue;
    }
    if (!f.variants.includes(v)) {
      errors[f.id] =
        `${f.id}="${v}" is not a known variant (allowed: ${f.variants.join(", ")})`;
    }
  }

  // 1. Unknown feature ids — the catalog is the source of truth.
  //    If the user passes extras (forward-compat, typos), record them
  //    on a synthetic key so the installer can warn but not block.
  //    The decision: STRICT — unknown keys are errors in Phase 20;
  //    `syncFeaturesToConfig` in Phase 21 will be the place that
  //    tolerates them when reading older projects.
  for (const k of Object.keys(features)) {
    if (!FEATURE_CATALOG.some((f) => f.id === k)) {
      errors[k] = `${k} is not a known feature id`;
    }
  }

  // If we already have shape errors, stop here — the dependency
  // rules operate on a known-good set. Otherwise we'd produce
  // confusing "jsLib requires js" errors when the real problem is
  // that the value is just unknown.
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, warnings: {} };
  }

  // 1. `jsLib`, `jsTest`, `restBatch`, `css` require `js` ≠ none.
  if (features.js === "none") {
    for (const f of ["jsLib", "jsTest", "restBatch", "css"]) {
      const v = features[f];
      // Only complain when the dependent feature is actually set
      // to a "real" value. `jsLib: "none"` is a no-op; `jsLib: "preact"`
      // is the violation.
      if (f === "jsLib" && v === "none") continue;
      if (f === "jsTest" && v === "none") continue;
      if (f === "css" && v === "none") continue;
      if (f === "restBatch" && v === "off") continue;
      // The dependent feature is set to a non-default value while
      // js is none — that's a violation.
      if (f === "restBatch" && v === "on") {
        errors.restBatch =
          "restBatch=on requires js ≠ none (currently js=none)";
      } else if (v !== undefined && v !== f && v !== "none" && v !== "off") {
        // For jsLib / jsTest / css: "real" value = not "none".
        errors[f] = `${f}="${v}" requires js ≠ none (currently js=none)`;
      }
    }
  }

  // 2. `faultTolerance: on` requires `phpMinVersion` ≥ 8.1.
  if (features.faultTolerance === "on") {
    if (comparePhpVersion(features.phpMinVersion, "8.1") < 0) {
      errors.faultTolerance =
        `faultTolerance=on requires phpMinVersion ≥ 8.1 ` +
        `(currently phpMinVersion=${features.phpMinVersion})`;
    }
  }

  // 3. `blocks: on` requires `js` ≠ none AND `wpMinVersion` ≥ 5.8.
  if (features.blocks === "on") {
    if (features.js === "none") {
      errors.blocks = "blocks=on requires js ≠ none (currently js=none)";
    } else if (comparePhpVersion(features.wpMinVersion, "5.8") < 0) {
      // Note: plan §1.1 says "≥ 5.8" for wpMinVersion. The version
      // comparator treats "5.8" and "5.8.0" as equal; that matches
      // the plan's "major.minor" shape.
      errors.blocks =
        `blocks=on requires wpMinVersion ≥ 5.8 ` +
        `(currently wpMinVersion=${features.wpMinVersion})`;
    }
  }

  // 4. Warnings (Phase 25.G2) — advisory only, never block.
  //    `license=mit` is technically a valid SPDX id, but
  //    WordPress.org's plugin directory requires GPL compatibility
  //    (https://wordpress.org/plugins/developers/#legal). MIT is
  //    permissively licensed but not GPL-compatible, so a plugin
  //    shipped to .org with MIT text may be rejected at review time.
  //    We do NOT block — the developer may intentionally pick MIT for
  //    a self-hosted, non-.org-distributed plugin. We SURFACE the
  //    warning so the CLI can flag it before scaffold.
  if (features.license === "mit") {
    warnings.license =
      `license=mit is not GPL-compatible; WordPress.org plugin ` +
      `directory requires GPL2/GPL3. The scaffold will still emit ` +
      `MIT, but the plugin may be rejected at .org review time.`;
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
