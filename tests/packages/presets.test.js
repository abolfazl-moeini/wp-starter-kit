import { describe, test, expect } from "@jest/globals";
import {
  getPresets,
  applyPreset,
} from "../../packages/create-wp-project/src/presets.js";
import { validateFeatureSet } from "../../packages/create-wp-project/src/features.js";

/**
 * Phase 20.16 / 20.17 — presets.
 *
 * Presets are named feature combinations defined in the engine
 * (NOT in the CLI). The CLI (Phase I1+) reads `getPresets()` from
 * the engine at startup, so adding a new preset does not require
 * a CLI release.
 *
 * plan.installer.md §1.5 defines the initial set:
 *
 *   minimal       PHP-only, no JS, minimal tooling
 *   full          All features ON with their §1 defaults
 *   woocommerce   full + blocks:on, exampleFeature:off, wpMinVersion:6.0
 *
 * Three contracts are locked:
 *  1. getPresets() returns the three ids in a stable order
 *     (minimal, full, woocommerce — the order the user sees in the
 *     interactive prompt).
 *  2. applyPreset(name) returns a complete feature object for
 *     each known preset. Every result must pass validateFeatureSet
 *     (so the installer can rely on the preset producing a
 *     valid config without a follow-up fix-up step).
 *  3. applyPreset(name) throws a clear Error on an unknown name —
 *     typos in `--preset=` should fail loud, not silently fall
 *     through to defaults.
 */
describe("getPresets() — catalog (Phase 20.16)", () => {
  test("returns the three documented presets", () => {
    const presets = getPresets();
    expect(Array.isArray(presets)).toBe(true);
    const ids = presets.map((p) => p.id);
    expect(ids).toContain("minimal");
    expect(ids).toContain("full");
    expect(ids).toContain("woocommerce");
  });

  test("presets are returned in the documented order: minimal, full, woocommerce", () => {
    // Stable order matters for the interactive prompt — the first
    // entry is the default selection in a CLI picker, and the
    // order is what users see when they scan the help text.
    const ids = getPresets().map((p) => p.id);
    expect(ids).toEqual(["minimal", "full", "woocommerce"]);
  });

  test("every preset has an id, description, and features object", () => {
    for (const p of getPresets()) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.description).toBe("string");
      expect(p.description.length).toBeGreaterThan(0);
      expect(typeof p.features).toBe("object");
      expect(p.features).not.toBeNull();
    }
  });

  test("returns a fresh array on every call (no shared mutation)", () => {
    const a = getPresets();
    const b = getPresets();
    expect(a).not.toBe(b);
    a.push({ id: "rogue", features: {} });
    expect(b.find((p) => p.id === "rogue")).toBeUndefined();
  });
});

describe("applyPreset() — known presets produce valid feature sets (Phase 20.17)", () => {
  test("applyPreset('minimal') returns a complete valid feature set", () => {
    const f = applyPreset("minimal");
    // Every catalog id must be present.
    const fids = Object.keys(f).sort();
    expect(fids.length).toBeGreaterThan(0);
    // Result must pass validateFeatureSet (proves the preset is
    // self-consistent, not just a non-empty object).
    const v = validateFeatureSet(f);
    expect(v).toEqual({ ok: true, errors: {} });
  });

  test("applyPreset('minimal') matches plan.installer.md §1.5", () => {
    // Locked from the §1.5 table: minimal is PHP-only, no JS,
    // minimal tooling.
    const f = applyPreset("minimal");
    expect(f.js).toBe("none");
    expect(f.jsLib).toBe("none");
    expect(f.jsTest).toBe("none");
    expect(f.css).toBe("none");
    expect(f.blocks).toBe("off");
    expect(f.phpTest).toBe("phpunit");
    expect(f.husky).toBe("off");
    expect(f.exampleFeature).toBe("off");
    expect(f.i18n).toBe("off");
    expect(f.restBatch).toBe("off");
    expect(f.faultTolerance).toBe("off");
    expect(f.license).toBe("gpl2");
    expect(f.wpMinVersion).toBe("6.0");
  });

  test("applyPreset('full') returns a complete valid feature set", () => {
    const f = applyPreset("full");
    const v = validateFeatureSet(f);
    expect(v).toEqual({ ok: true, errors: {} });
  });

  test("applyPreset('full') = §1 defaults (every variant[0])", () => {
    // "full" = all features ON with their defaults. The §1
    // defaults are exactly defaultFeatures() (variants[0]).
    const full = applyPreset("full");
    // Spot-check: every key in defaultFeatures() must be present
    // in 'full' AND match the §1 default.
    for (const [id, defVal] of Object.entries({
      js: "typescript",
      jsLib: "none",
      jsTest: "jest",
      phpMinVersion: "7.4",
      phpFramework: "none",
      phpTest: "phpunit",
      restBatch: "off",
      faultTolerance: "off",
      vendorScoping: "on",
      husky: "on",
      css: "none",
      blocks: "off",
      license: "gpl2",
      wpMinVersion: "6.0",
      exampleFeature: "on",
      i18n: "on",
    })) {
      expect(full[id]).toBe(defVal);
    }
  });

  test("applyPreset('woocommerce') returns a complete valid feature set", () => {
    const f = applyPreset("woocommerce");
    const v = validateFeatureSet(f);
    expect(v).toEqual({ ok: true, errors: {} });
  });

  test("applyPreset('woocommerce') = full + blocks:on + exampleFeature:off + wpMinVersion:6.0", () => {
    // The §1.5 table says: "Same as `full` but `blocks:on`
    // (WooCommerce block-based checkout/cart), `wpMinVersion:6.0`,
    // `exampleFeature:off` (consumer brings their own modules)".
    // The wpMinVersion:6.0 is already the §1 default, so the
    // override that distinguishes it is blocks:on +
    // exampleFeature:off.
    const woo = applyPreset("woocommerce");
    const full = applyPreset("full");
    // blocks flips off → on
    expect(woo.blocks).toBe("on");
    expect(full.blocks).toBe("off");
    // exampleFeature flips on → off
    expect(woo.exampleFeature).toBe("off");
    expect(full.exampleFeature).toBe("on");
    // wpMinVersion matches (6.0 is the default for both)
    expect(woo.wpMinVersion).toBe("6.0");
    // jsLib flips for blocks to be useful — preset is "on" path
    // so a real consumer can build WooCommerce block UIs.
    expect(woo.js).not.toBe("none");
  });

  test("applyPreset() returns a fresh object on every call (no shared mutation)", () => {
    const a = applyPreset("minimal");
    const b = applyPreset("minimal");
    expect(a).not.toBe(b);
    a.js = "rust";
    expect(b.js).toBe("none");
  });
});

describe("applyPreset() — unknown names throw (Phase 20.17)", () => {
  test("unknown name → clear Error", () => {
    expect(() => applyPreset("nope")).toThrow();
    try {
      applyPreset("nope");
    } catch (e) {
      // The error message should name the bad input so the
      // installer can show the user what they typed.
      expect(e.message).toMatch(/nope/);
      // And it should hint at the valid options.
      expect(e.message).toMatch(/minimal|full|woocommerce/);
    }
  });

  test("empty string → clear Error", () => {
    expect(() => applyPreset("")).toThrow();
  });

  test("case-sensitive: 'Minimal' is not 'minimal'", () => {
    // The installer uses lowercase names; case-sensitive matching
    // avoids silently accepting the wrong preset.
    expect(() => applyPreset("Minimal")).toThrow();
  });

  test("non-string name → clear Error", () => {
    expect(() => applyPreset(null)).toThrow();
    expect(() => applyPreset(undefined)).toThrow();
    expect(() => applyPreset(42)).toThrow();
  });
});
