/**
 * 1.0.0 migration — WPDev Framework bridge update.
 *
 * For projects with phpFramework:wpdev, this migration:
 *   - Writes/updates src/Support/FrameworkBridge.php and src/wpdev-demo-register.php.
 *   - Writes MIGRATION-NOTES-1.0.0.md (install WPDev as a site plugin; no companion-plugins/).
 *
 * Idempotent: skips if phpFramework is not wpdev.
 * Does NOT create or copy companion-plugins/.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { readWpdevFrameworkVersion } from "../dep-versions.js";
import { readManifest } from "../manifest.js";

export const version = "1.0.0";
export const description =
  "Update WPDev Framework bridge registration (soft dependency; no companion-plugins)";

const TEMPLATE_BRIDGE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Support;

use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;

/**
 * Bridge helper for WPDev Framework integration.
 * Admin notice for a missing framework lives in the main plugin file.
 */
final class FrameworkBridge
{
    public static function is_framework_active(): bool
    {
        return WpdevModuleAdapter::is_framework_active();
    }

    public static function init(): void
    {
        // Intentionally empty — main plugin bootstrap shows the notice.
    }
}
`;

const TEMPLATE_REGISTER_PHP = `<?php
declare(strict_types=1);

use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;
use {{vendor}}\\Modules\\WpdevDemo\\Module;
use {{vendor}}\\Support\\FrameworkBridge;

/**
 * Conditionally registers the WpdevDemo module on plugins_loaded (priority 5).
 */
if (!function_exists('add_action')) {
    return;
}

FrameworkBridge::init();

\\add_action(
    'plugins_loaded',
    static function (): void {
        WpdevModuleAdapter::attach(new Module());
    },
    5
);
if (did_action('plugins_loaded')) {
    WpdevModuleAdapter::attach(new Module());
}
`;

const TEMPLATE_NOTES_MD = `# WPDev Framework Migration Notes (v1.0.0)

This project uses \`phpFramework: wpdev\` as a **soft dependency**.

1. Install and activate the **WPDev Admin Framework** as a normal WordPress plugin on the site.
2. This kit no longer vendors the framework under \`companion-plugins/\`.
3. When the framework is inactive, the host plugin shows an admin notice in wp-admin.
4. Kit bridge files: \`src/Support/FrameworkBridge.php\`, \`src/wpdev-demo-register.php\`.

Bridge version reference: {{wpdevFrameworkVersion}}.
`;

function render(tmpl, vars) {
  return tmpl.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (full, key) => {
    return vars[key] !== undefined && vars[key] !== null
      ? String(vars[key])
      : full;
  });
}

export async function run(dir) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "run(dir) requires a directory" };
  }

  const manifest = readManifest(dir);
  const features = (manifest && manifest.features) || {};
  if (features.phpFramework !== "wpdev") {
    return { ok: true };
  }

  // Read project config to fill templates
  const cfgPath = path.join(dir, "wpdev.json");
  let cfg = {};
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    } catch (err) {
      return {
        ok: false,
        reason: `Failed to read wpdev.json: ${err.message}`,
      };
    }
  }

  const tpl = {
    ...cfg,
    vendor: cfg.globalName || "WPDev",
    frameworkNamespace: cfg.frameworkNamespace || cfg.globalName || "WPDev",
    slug: cfg.slug || "my-plugin",
    slug_underscore: String(cfg.slug || "my-plugin").replace(/-/g, "_"),
    textDomain: cfg.textDomain || cfg.slug || "my-plugin",
  };

  try {
    await fs.mkdir(path.join(dir, "src", "Support"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "src", "Support", "FrameworkBridge.php"),
      render(TEMPLATE_BRIDGE_PHP, tpl),
      "utf8",
    );
    await fs.writeFile(
      path.join(dir, "src", "wpdev-demo-register.php"),
      render(TEMPLATE_REGISTER_PHP, tpl),
      "utf8",
    );
    const fwVersion = readWpdevFrameworkVersion() || "unknown";
    await fs.writeFile(
      path.join(dir, "MIGRATION-NOTES-1.0.0.md"),
      render(TEMPLATE_NOTES_MD, { ...tpl, wpdevFrameworkVersion: fwVersion }),
      "utf8",
    );
  } catch (error) {
    return {
      ok: false,
      reason: `Failed to write bridge files: ${error.message}`,
    };
  }

  return { ok: true };
}
