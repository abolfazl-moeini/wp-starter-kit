/**
 * TEMPORARY engine stub — Phase I1 / I2 only.
 *
 * This file mirrors the function surface of the real engine
 * (`@wpsk/create-wp-project`) that `plan.v3.md` Phase 20 builds.
 * Until that phase lands, the CLI can be developed and tested
 * against this hard-coded data. When the real engine exports the
 * same names, the only change is the import path in `gather.js`
 * and `flags.js` (if it imports `getFeatureCatalog` for the flag
 * default).
 *
 * The catalog data here MUST stay in sync with `plan.v3.md` §1 —
 * the installer's flag set, prompt plan, and validation rules all
 * derive from this. If the real engine ships with a different
 * default, treat the real engine as the source of truth and update
 * the test snapshots.
 */

/* -------------------------------------------------------------------- */
/* Feature catalog (plan.v3.md §1)                                       */
/* -------------------------------------------------------------------- */

/**
 * The catalog is a plain array of { id, question, variants, default }.
 * The CLI does not consume `question` (its prompts.js owns the UX
 * text) but we keep it here so a CLI + engine integration test could
 * round-trip the same metadata.
 */
const FEATURE_CATALOG = [
  {
    id: "js",
    question: "Use JavaScript at all?",
    variants: ["typescript", "pure", "flow", "none"],
    default: "typescript",
    note: "none = PHP-only plugin, no JS build",
  },
  {
    id: "jsLib",
    question: "Use a UI library?",
    variants: ["none", "preact", "react"],
    default: "preact",
    note: "Only asked if js ≠ none",
    requires: { field: "js", notEquals: "none" },
  },
  {
    id: "jsTest",
    question: "JS unit testing tool?",
    variants: ["jest", "vitest", "none"],
    default: "jest",
    note: "Only if js ≠ none",
    requires: { field: "js", notEquals: "none" },
  },
  {
    id: "phpMinVersion",
    question: "Lowest PHP to support?",
    variants: ["7.4", "8.0", "8.1", "8.2", "8.3"],
    default: "7.4",
    note: "Drives Rector downgrade target",
  },
  {
    id: "phpFramework",
    question: "Use wpdev-framework?",
    variants: ["none", "wpdev"],
    default: "none",
  },
  {
    id: "phpTest",
    question: "PHP unit testing?",
    variants: ["phpunit", "none"],
    default: "phpunit",
  },
  {
    id: "restBatch",
    question: "Include REST batch + @scope/fetch?",
    variants: ["off", "on"],
    default: "on",
    note: "Needs js ≠ none for the JS half",
    requires: { field: "js", notEquals: "none", whenOn: true },
  },
  {
    id: "faultTolerance",
    question: "Include PHP fault-tolerance package?",
    variants: ["off", "on"],
    default: "off",
    note: "Requires phpMinVersion ≥ 8.1",
  },
  {
    id: "vendorScoping",
    question: "Strauss vendor scoping on release?",
    variants: ["on", "off"],
    default: "on",
  },
  {
    id: "husky",
    question: "Git pre-commit hooks?",
    variants: ["on", "off"],
    default: "on",
  },
  {
    id: "css",
    question: "CSS framework?",
    variants: ["none", "sass", "tailwind", "postcss"],
    default: "none",
    note: "Requires js ≠ none for the build pipeline",
    requires: { field: "js", notEquals: "none", whenOn: true },
  },
  {
    id: "blocks",
    question: "Gutenberg block support?",
    variants: ["off", "on"],
    default: "off",
    note: "Requires js ≠ none AND wpMinVersion ≥ 5.8",
  },
  {
    id: "license",
    question: "License?",
    variants: ["gpl2", "gpl3", "mit"],
    default: "gpl2",
  },
  {
    id: "wpMinVersion",
    question: "Minimum WordPress version?",
    variants: ["6.0", "5.8", "6.2", "6.4", "6.6"],
    default: "6.0",
  },
  {
    id: "exampleFeature",
    question: "Include the ExampleFeature demo module?",
    variants: ["on", "off"],
    default: "on",
  },
  {
    id: "i18n",
    question: "Translation pipeline?",
    variants: ["on", "off"],
    default: "on",
  },
];

/**
 * Return the feature catalog. The shape is the same as the real
 * engine will export (an array of feature descriptors) so the CLI
 * consumer code does not need to know whether it is reading the
 * stub or the real engine.
 */
export function getFeatureCatalog() {
  return FEATURE_CATALOG;
}

/**
 * Return the all-defaults feature set. `mergeInputs()` calls this
 * to fill missing keys (the lowest precedence layer).
 */
export function defaultFeatures() {
  const out = {};
  for (const f of FEATURE_CATALOG) {
    out[f.id] = f.default;
  }
  return out;
}

/* -------------------------------------------------------------------- */
/* Validation (plan.v3.md §1.1 dependency rules)                         */
/* -------------------------------------------------------------------- */

const PHP_MIN_ORDER = ["7.4", "8.0", "8.1", "8.2", "8.3"];
function phpMinIndex(v) {
  const i = PHP_MIN_ORDER.indexOf(v);
  return i === -1 ? -1 : i;
}
const PHP_MIN_81_INDEX = PHP_MIN_ORDER.indexOf("8.1");

const WP_MIN_ORDER = ["5.8", "6.0", "6.2", "6.4", "6.6"];
function wpMinIndex(v) {
  const i = WP_MIN_ORDER.indexOf(v);
  return i === -1 ? -1 : i;
}
const WP_MIN_58_INDEX = WP_MIN_ORDER.indexOf("5.8");

/**
 * Validate the feature set against the dependency rules in
 * plan.v3.md §1.1. Returns `{ ok, errors }` so callers can render
 * every error at once instead of fail-on-first.
 *
 * @param {Record<string,string>} features
 * @returns {{ok: boolean, errors: Record<string,string>}}
 */
export function validateFeatureSet(features) {
  const errors = {};
  if (!features || typeof features !== "object") {
    return { ok: false, errors: { _root: "features must be an object" } };
  }

  // Rule 1: jsLib / jsTest / restBatch (JS half) / css require js ≠ none.
  const js = features.js || "none";
  if (js === "none") {
    if (features.jsLib && features.jsLib !== "none") {
      errors.jsLib = `jsLib requires js != none (got js="${js}")`;
    }
    if (features.jsTest && features.jsTest !== "none") {
      errors.jsTest = `jsTest requires js != none (got js="${js}")`;
    }
    if (features.restBatch === "on") {
      errors.restBatch = `restBatch (JS half) requires js != none`;
    }
    if (features.css && features.css !== "none") {
      errors.css = `css requires js != none (got js="${js}")`;
    }
  }

  // Rule 2: faultTolerance:on requires phpMinVersion ≥ 8.1
  if (features.faultTolerance === "on") {
    const idx = phpMinIndex(features.phpMinVersion);
    if (idx < PHP_MIN_81_INDEX) {
      errors.faultTolerance = `faultTolerance:on requires phpMinVersion >= 8.1 (got "${features.phpMinVersion}")`;
    }
  }

  // Rule 3: blocks:on requires js ≠ none AND wpMinVersion ≥ 5.8
  if (features.blocks === "on") {
    if (js === "none") {
      errors.blocks = `blocks:on requires js != none (got js="${js}")`;
    } else {
      const wpIdx = wpMinIndex(features.wpMinVersion);
      if (wpIdx < WP_MIN_58_INDEX) {
        errors.blocks = `blocks:on requires wpMinVersion >= 5.8 (got "${features.wpMinVersion}")`;
      }
    }
  }

  // Rule 4: restBatch:on with js ≠ none is allowed (we already
  // covered the js=none case above). No additional check.

  // Rule 5 (flow vs tsc): informational. The kit's generators
  // decide whether to wire tsc; the installer does not need to
  // gate on this. Skipped.

  // Rule 6 (css + build): handled by the engine generators. No
  // installer-level gate.

  // Rule 7 (phpTest=phpunit requires composer.json): handled by
  // the engine generators (composer.json is always emitted by the
  // core generator when phpTest=phpunit). Installer-level skip.

  // Rule 8 (license:mit with WordPress): warn-only. The plan
  // says "the installer warns"; we model that as a non-blocking
  // `warnings` field, not an error. Downstream code can surface
  // the warning separately.

  // Unknown feature ids: not validated here (the catalog is the
  // source of truth; an unknown id means a typo in the caller's
  // code, not a user error).

  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------- */
/* Presets (plan.installer.md §1.5)                                      */
/* -------------------------------------------------------------------- */

const PRESETS = {
  minimal: {
    js: "none",
    jsLib: "none",
    jsTest: "none",
    css: "none",
    blocks: "off",
    phpTest: "phpunit",
    husky: "off",
    exampleFeature: "off",
    i18n: "off",
    restBatch: "off",
    faultTolerance: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
  },
  // 'full' is the all-defaults set; we spell it out so the
  // catalog stays the single source of truth and `applyPreset`
  // still has something to do.
  full: defaultFeatures(),
  woocommerce: (() => {
    const f = defaultFeatures();
    f.blocks = "on";
    f.wpMinVersion = "6.0";
    f.exampleFeature = "off";
    return f;
  })(),
};

export function getPresets() {
  return Object.keys(PRESETS);
}

/**
 * Return the feature set for a named preset. Unknown name → clear
 * error (the plan §I2 calls this out explicitly).
 *
 * @param {string} name
 * @returns {Record<string,string>}
 */
export function applyPreset(name) {
  if (!Object.prototype.hasOwnProperty.call(PRESETS, name)) {
    const known = Object.keys(PRESETS).join(", ");
    const err = new Error(`Unknown preset: "${name}" (valid: ${known})`);
    err.code = "WPSK_UNKNOWN_PRESET";
    throw err;
  }
  // Return a shallow copy so callers cannot mutate the registry.
  return { ...PRESETS[name] };
}
