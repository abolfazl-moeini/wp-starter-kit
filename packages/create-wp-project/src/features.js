/**
 * @wpdev/create-wp-project — feature catalog & validation
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
    notes:
      "WPDev Admin Framework (companion plugin). `wpdev` scaffolds companion-plugins/wpdev/, " +
      "FrameworkBridge, and WpdevDemo. Reserves the wpdev_* hook/function prefix for the framework.",
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
    notes:
      "REST batch endpoint + batch client in @scope/rest-utils (not a separate fetch dep).",
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
      "Gutenberg blocks via Blockstudio 7 (blockstudio/blockstudio). " +
      "PHP-first; 30+ field types defined in block.json; no build step required. " +
      "Requires PHP 8.2+ at runtime (Rector can downlevel plugin source, but not Blockstudio vendor code). " +
      "WordPress 6.7+ minimum; 7.0 recommended for Block API v3 (iframed editor, pattern overrides).",
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
  {
    id: "frontendStack",
    variants: ["none", "polaris"],
    default: "none",
    notes:
      "Design system foundation. `polaris` = Polaris Stack (CSS vars + layout primitives + basic styled components). v1 requires js=typescript and jsLib=react/preact.",
  },
  {
    id: "mcpAbilities",
    variants: ["off", "on"],
    default: "off",
    notes:
      "WordPress Abilities API integration (wp-mcp-integration). Registers abilities the MCP Adapter can expose as tools. Requires WordPress 6.9+ at runtime.",
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
/* normalizeFeatureSet                                                   */
/* -------------------------------------------------------------------- */

/**
 * Coerce JS-dependent features when `js:none` so flag/preset merges
 * do not leave stale `jsTest`/`jsLib`/`css` values behind.
 *
 * @param {Record<string, string>} features
 * @returns {Record<string, string>}
 */
export function normalizeFeatureSet(features) {
  const f = { ...features };
  if (f.js === "none") {
    f.jsLib = "none";
    f.jsTest = "none";
    f.css = "none";
    f.restBatch = "off";
    if (f.frontendStack && f.frontendStack !== "none") {
      f.frontendStack = "none";
    }
  }
  return f;
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
export function validateFeatureSet(features, answers = {}) {
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

  // 2.5. `frontendStack: polaris` requires TypeScript + React/Preact.
  if (features["frontendStack"] === "polaris") {
    const needsTs = features["js"] !== "typescript";
    const needsLib =
      features["jsLib"] !== "react" && features["jsLib"] !== "preact";
    if (needsTs || needsLib) {
      const msgs = [];
      if (needsTs) {
        msgs.push(`js must be typescript (currently js=${features["js"]})`);
      }
      if (needsLib) {
        msgs.push(
          `jsLib must be react or preact (currently jsLib=${features["jsLib"]})`,
        );
      }
      errors["frontendStack"] =
        "frontendStack=polaris (v1) requires: " + msgs.join("; ");
    }
  }

  // 2.6. Polaris conflicts with Tailwind in v1.
  if (
    features["frontendStack"] === "polaris" &&
    features["css"] === "tailwind"
  ) {
    errors["frontendStack"] =
      "frontendStack=polaris is not compatible with css=tailwind in v1. " +
      "Polaris uses global BEM CSS + design tokens; Tailwind conflicts with the layout/style separation rule.";
  }

  // 3. blocks:on — Blockstudio runtime requirements (warnings only in v1).
  if (features.blocks === "on") {
    if (comparePhpVersion(features.wpMinVersion, "6.7") < 0) {
      warnings.blocks =
        "blocks=on uses Blockstudio, which targets WordPress 6.7+ (7.0 recommended for Block API v3 iframe editor). " +
        `Current wpMinVersion=${features.wpMinVersion}.`;
    }

    if (comparePhpVersion(features.phpMinVersion, "8.2") < 0) {
      warnings.blocksPhp =
        "blocks=on requires Blockstudio (PHP 8.2+ at runtime on the server). " +
        `Your phpMinVersion=${features.phpMinVersion} enables Rector to downgrade YOUR plugin PHP source, ` +
        "but Blockstudio itself cannot run on PHP < 8.2. " +
        "Recommend phpMinVersion 8.2 when using blocks, or omit blocks for PHP 7.4-only hosts.";
    } else {
      warnings.blocks =
        warnings.blocks ||
        "blocks=on adds blockstudio/blockstudio via Composer. Run composer install after scaffold.";
    }
  }

  // 4. Warnings (Phase 25.G2) — advisory only, never block.
  //    `license=mit` is technically a valid SPDX id and is
  //    GPL-compatible, but the WordPress.org plugin directory
  //    requires hosted plugins themselves to be licensed under
  //    GPL-2.0-or-later (or later)
  //    (https://wordpress.org/plugins/developers/#legal). A plugin
  //    shipped to .org with MIT text may be rejected at review time.
  //    We do NOT block — the developer may intentionally pick MIT for
  //    a self-hosted, non-.org-distributed plugin. We SURFACE the
  //    warning so the CLI can flag it before scaffold.
  if (features.license === "mit") {
    warnings.license =
      `license=mit is GPL-compatible, but the WordPress.org plugin ` +
      `directory requires hosted plugins to be GPL-2.0-or-later (or later). ` +
      `The scaffold will still emit MIT, but the plugin may be rejected at .org review time.`;
  }

  if (features.phpFramework === "wpdev") {
    const hookPrefix = answers.hookPrefix || "wpdev";
    const phpFunctionPrefix = answers.phpFunctionPrefix || "wpdev_";
    if (hookPrefix === "wpdev") {
      errors.phpFramework =
        "phpFramework=wpdev reserves the 'wpdev' hook prefix for the framework. Choose a project-unique hookPrefix (e.g. your slug).";
    }
    if (phpFunctionPrefix === "wpdev_") {
      errors.phpFunctionPrefix =
        "phpFramework=wpdev reserves the 'wpdev_' PHP function prefix for the framework. Choose a project-unique phpFunctionPrefix.";
    }
  }

  if (features.mcpAbilities === "on") {
    warnings.mcpAbilities =
      "mcpAbilities=on requires WordPress 6.9+ at runtime (the Abilities API). " +
      "The generated plugin shows an admin notice and registers nothing when the API is missing.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}
