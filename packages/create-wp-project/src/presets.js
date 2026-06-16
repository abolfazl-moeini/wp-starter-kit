/**
 * @wpsk/create-wp-project — feature presets.
 *
 * Phase 20 of plan.v3.md. Presets are named feature combinations
 * that pre-fill the installer's question flow. The CLI (Phase I1+)
 * reads `getPresets()` from the engine at startup, so adding a new
 * preset does not require a CLI release.
 *
 * The three documented presets come from plan.installer.md §1.5:
 *
 *   minimal      PHP-only, no JS, minimal tooling
 *   full         All features ON with their §1 defaults
 *   woocommerce  full + blocks:on + exampleFeature:off +
 *                jsLib:preact (for block UIs)
 *
 * Order matters: the first entry returned by getPresets() is the
 * default selection in a CLI picker. We order
 * `minimal, full, woocommerce` so the lightest option is first.
 *
 * Every preset is verified to pass `validateFeatureSet()` — that
 * is locked by tests/packages/presets.test.js. If a future preset
 * violates a §1.1 rule, the test catches it.
 *
 * Note: `defaultFeatures()` is imported from features.js. The
 * 'full' preset is exactly defaultFeatures() — there's no
 * divergence. If a future feature is added to the catalog and
 * the new default is suitable for 'full', the preset updates
 * automatically.
 */

import { defaultFeatures } from "./features.js";

/* -------------------------------------------------------------------- */
/* Preset catalog                                                        */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} PresetDescriptor
 * @property {string} id             Stable preset id (CLI flag value).
 * @property {string} description    One-line human description for
 *                                   `--help` output and prompt UI.
 * @property {Record<string,string>} features
 *                                   The complete feature set the
 *                                   preset pre-fills.
 */

/**
 * Build the 'minimal' preset: PHP-only plugin, no JS, no
 * scaffolding beyond the bare essentials. Mirrors the
 * `minimal` row in plan.installer.md §1.5.
 */
function buildMinimal() {
  return {
    js: "none",
    jsLib: "none",
    jsTest: "none",
    css: "none",
    blocks: "off",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "off",
    exampleFeature: "off",
    i18n: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
  };
}

/**
 * Build the 'full' preset: every feature ON with its §1 default.
 * Equivalent to defaultFeatures() — using the function rather
 * than a hand-rolled object means the preset automatically
 * tracks any future catalog additions.
 */
function buildFull() {
  return { ...defaultFeatures() };
}

/**
 * Build the 'woocommerce' preset: full + blocks:on +
 * exampleFeature:off + jsLib:preact (so a real consumer can
 * build WooCommerce block UIs without a follow-up flag flip).
 * Mirrors the `woocommerce` row in plan.installer.md §1.5.
 *
 * jsLib flips to 'preact' (the kit's default UI library) for
 * the same reason `wpMinVersion:6.0` is kept — a real
 * WooCommerce consumer who turns on blocks will want a UI
 * library to build them with. The §1.5 table does not pin the
 * jsLib variant, so we pick the most useful one: the kit's
 * own framework.
 */
function buildWoocommerce() {
  return {
    ...buildFull(),
    blocks: "on",
    exampleFeature: "off",
    jsLib: "preact",
  };
}

const PRESET_BUILDERS = [
  ["minimal", "PHP-only, no JS, minimal tooling.", buildMinimal],
  ["full", "All features ON with their §1 defaults.", buildFull],
  [
    "woocommerce",
    "Full + blocks:on, optimized for WooCommerce extensions (consumer brings their own modules).",
    buildWoocommerce,
  ],
];

/* -------------------------------------------------------------------- */
/* getPresets                                                            */
/* -------------------------------------------------------------------- */

/**
 * Return the catalog of presets, in stable order. A fresh array
 * is returned on every call so callers can mutate without
 * affecting later reads.
 *
 * @returns {PresetDescriptor[]}
 */
export function getPresets() {
  return PRESET_BUILDERS.map(([id, description, build]) => ({
    id,
    description,
    features: build(),
  }));
}

/* -------------------------------------------------------------------- */
/* applyPreset                                                           */
/* -------------------------------------------------------------------- */

/**
 * Look up a preset by id and return its complete feature set.
 * Throws a clear Error on an unknown name (case-sensitive) —
 * a typo in `--preset=` should fail loud, not silently fall
 * through to defaults.
 *
 * @param {string} name
 * @returns {Record<string,string>}
 */
export function applyPreset(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error(
      `applyPreset: name is required (string) — got ${JSON.stringify(name)}. ` +
        `Known presets: ${PRESET_BUILDERS.map(([id]) => id).join(", ")}.`,
    );
  }
  for (const [id, , build] of PRESET_BUILDERS) {
    if (id === name) {
      return build();
    }
  }
  throw new Error(
    `applyPreset: unknown preset "${name}". ` +
      `Known presets: ${PRESET_BUILDERS.map(([id]) => id).join(", ")}.`,
  );
}
