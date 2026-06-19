/**
 * 0.3.0 migration — wpdev.json → wpdev.json rebrand.
 *
 * Renames the legacy manifest for consumers upgrading from pre-rebrand kits.
 * Optionally patches wpdev.json only if it still has old default
 * branding (to avoid clobbering user customizations).
 *
 * Idempotent and safe.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";

export const version = "0.3.0";
export const description =
  "Rename wpsk-kit.json → wpdev.json (rebrand) and patch legacy default branding in wpdev.json if present";

const OLD_MANIFEST = "wpsk-kit.json";
const NEW_MANIFEST = "wpdev.json";

const LEGACY_DEFAULTS = {
  slug: "wpsk-starter",
  globalName: "WPSK",
  localizeVar: "WPSKLoc",
  textDomain: "wpsk-starter",
  hookPrefix: "wpsk",
  npmScope: "@wpsk",
  depsBundle: "wpsk-starter-deps.js",
  phpFunctionPrefix: "wpsk_",
  restNamespace: "wpsk/v1",
  vendorPrefix: "WpskVendor",
};

export async function run(dir) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "run(dir) requires a directory" };
  }

  const oldPath = path.join(dir, OLD_MANIFEST);
  const newPath = path.join(dir, NEW_MANIFEST);

  // 1. Rename manifest if old exists and new does not.
  if (existsSync(oldPath) && !existsSync(newPath)) {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      return {
        ok: false,
        reason: `Failed to rename manifest: ${error.message}`,
      };
    }
  }

  // 2. Optionally patch wpdev.json ONLY if values still match legacy defaults.
  const cfgPath = path.join(dir, "wpdev.json");
  if (existsSync(cfgPath)) {
    try {
      await updateJsonFile(cfgPath, (cfg) => {
        if (!cfg || typeof cfg !== "object") return cfg;

        for (const [k, oldVal] of Object.entries(LEGACY_DEFAULTS)) {
          if (cfg[k] === oldVal) {
            if (k === "slug") cfg[k] = "wpdev-starter";
            else if (k === "globalName") cfg[k] = "WPDev";
            else if (k === "localizeVar") cfg[k] = "WPDevLoc";
            else if (k === "textDomain") cfg[k] = "wpdev-starter";
            else if (k === "hookPrefix") cfg[k] = "wpdev";
            else if (k === "npmScope") cfg[k] = "@wpdev";
            else if (k === "depsBundle") cfg[k] = "wpdev-starter-deps.js";
            else if (k === "phpFunctionPrefix") cfg[k] = "wpdev_";
            else if (k === "restNamespace") cfg[k] = "wpdev/v1";
            else if (k === "vendorPrefix") cfg[k] = "WpdevVendor";
          }
        }
        return cfg;
      });
    } catch (error) {
      // Non-fatal for config mirror
      return {
        ok: true,
        warning: `manifest renamed, but wpdev.json patch failed: ${error.message}`,
      };
    }
  }

  return { ok: true };
}
