/**
 * 0.3.0 migration — wpsk-kit.json → wpdev-kit.json rebrand.
 *
 * Renames the legacy manifest for consumers upgrading from pre-rebrand kits.
 * Optionally patches project.config.json only if it still has old default
 * branding (to avoid clobbering user customizations).
 *
 * Idempotent and safe.
 */

import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";

export const version = "0.3.0";
export const description =
  "Rename wpsk-kit.json → wpdev-kit.json (rebrand) and patch legacy default branding in project.config.json if present";

const OLD_MANIFEST = "wpsk-kit.json";
const NEW_MANIFEST = "wpdev-kit.json";

const LEGACY_DEFAULTS = {
  slug: "wpsk-starter",
  globalName: "WPSK",
  npmScope: "@wpsk",
  textDomain: "wpsk-starter",
  hookPrefix: "wpsk",
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
      return { ok: false, reason: `Failed to rename manifest: ${error.message}` };
    }
  }

  // 2. Optionally patch project.config.json ONLY if values still match legacy defaults.
  const cfgPath = path.join(dir, "project.config.json");
  if (existsSync(cfgPath)) {
    try {
      await updateJsonFile(cfgPath, (cfg) => {
        if (!cfg || typeof cfg !== "object") return cfg;

        let patched = false;
        for (const [k, oldVal] of Object.entries(LEGACY_DEFAULTS)) {
          if (cfg[k] === oldVal) {
            // Map to new defaults (basic ones)
            if (k === "slug") cfg[k] = "wpdev-starter";
            else if (k === "globalName") cfg[k] = "WPDev";
            else if (k === "npmScope") cfg[k] = "@wpdev";
            else if (k === "textDomain") cfg[k] = "wpdev-starter";
            else if (k === "hookPrefix") cfg[k] = "wpdev";
            patched = true;
          }
        }
        return cfg;
      });
    } catch (error) {
      // Non-fatal for config mirror
      return {
        ok: true,
        ran: true,
        warning: `manifest renamed, but project.config.json patch failed: ${error.message}`,
      };
    }
  }

  return { ok: true };
}
