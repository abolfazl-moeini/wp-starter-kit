/**
 * 1.0.0 migration — WPDev Framework companion update.
 *
 * For projects with phpFramework:wpdev, this migration:
 *   - Re-copies the companion plugin companion-plugins/wpdev/** from the updated kit framework.
 *   - Writes/updates src/Support/FrameworkBridge.php and src/wpdev-demo-register.php.
 *   - Writes MIGRATION-NOTES-1.0.0.md to guide the user on updating the plugin in WP admin.
 *
 * Idempotent: skips if phpFramework is not wpdev.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { readManifest } from "../manifest.js";

export const version = "1.0.0";
export const description =
  "Update WPDev companion framework plugin files and bridge registration";

const TEMPLATE_BRIDGE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Support;

use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;

/**
 * Bridge helper for WPDev Framework integration.
 */
final class FrameworkBridge
{
    public static function is_framework_active(): bool
    {
        return WpdevModuleAdapter::is_framework_active();
    }

    public static function init(): void
    {
        if (!self::is_framework_active()) {
            \\add_action('admin_notices', [self::class, 'render_notice']);
        }
    }

    public static function render_notice(): void
    {
        ?>
        <div class="notice notice-warning is-dismissible">
            <p><?php echo esc_html__('This plugin works best with the WPDev Framework. Install the plugin in \`companion-plugins/wpdev/\`.', '{{textDomain}}'); ?></p>
        </div>
        <?php
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

The WPDev Admin Framework companion plugin has been updated to v2.5.0.

Please update the companion plugin on your WordPress site:
1. Log in to your WordPress admin panel.
2. Go to Plugins.
3. If the WPDev Framework plugin is active, deactivate it first.
4. Replace/install the plugin files from your project's \`companion-plugins/wpdev/\` folder.
5. Re-activate the WPDev Framework plugin.
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

  // 1. Resolve framework source directory (same logic as phpFramework generator)
  const frameworkSrcDir =
    typeof __dirname !== "undefined" && __dirname
      ? path.resolve(__dirname, "../../../wpdev-framework")
      : path.resolve(process.cwd(), "packages/wpdev-framework");

  if (!existsSync(frameworkSrcDir)) {
    return {
      ok: false,
      reason: `WPDev Framework source not found at ${frameworkSrcDir}`,
    };
  }

  // 2. Read project config to fill templates
  const cfgPath = path.join(dir, "project.config.json");
  let cfg = {};
  if (existsSync(cfgPath)) {
    try {
      cfg = JSON.parse(await fs.readFile(cfgPath, "utf8"));
    } catch (err) {
      return {
        ok: false,
        reason: `Failed to read project.config.json: ${err.message}`,
      };
    }
  }

  const tpl = {
    ...cfg,
    vendor: cfg.globalName || "WPDev",
    frameworkNamespace: "WPDev",
    slug: cfg.slug || "my-plugin",
    slug_underscore: String(cfg.slug || "my-plugin").replace(/-/g, "_"),
    textDomain: cfg.textDomain || cfg.slug || "my-plugin",
  };

  // 3. Write bridge files
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
    await fs.writeFile(
      path.join(dir, "MIGRATION-NOTES-1.0.0.md"),
      TEMPLATE_NOTES_MD,
      "utf8",
    );
  } catch (error) {
    return {
      ok: false,
      reason: `Failed to write bridge files: ${error.message}`,
    };
  }

  // 4. Re-copy companion framework recursively
  const binaryExtensions = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".otf",
    ".pdf",
    ".zip",
  ]);

  async function copyDir(currentSrc, currentDest) {
    await fs.mkdir(currentDest, { recursive: true });
    const list = await fs.readdir(currentSrc);
    for (const file of list) {
      if (
        file === "." ||
        file === ".." ||
        file === ".DS_Store" ||
        file === ".git" ||
        file === ".cursor" ||
        file === ".kiro" ||
        file === "context.md" ||
        file === "vendor" ||
        file === "dist" ||
        file === "node_modules"
      ) {
        continue;
      }
      const srcPath = path.join(currentSrc, file);
      const destPath = path.join(currentDest, file);
      const stat = await fs.stat(srcPath);
      if (stat.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        const ext = path.extname(srcPath).toLowerCase();
        if (binaryExtensions.has(ext)) {
          const buffer = await fs.readFile(srcPath);
          await fs.writeFile(destPath, buffer);
        } else {
          const text = await fs.readFile(srcPath, "utf8");
          await fs.writeFile(destPath, text, "utf8");
        }
      }
    }
  }

  try {
    await copyDir(
      frameworkSrcDir,
      path.join(dir, "companion-plugins", "wpdev"),
    );
  } catch (error) {
    return {
      ok: false,
      reason: `Failed to copy companion framework: ${error.message}`,
    };
  }

  return { ok: true };
}
