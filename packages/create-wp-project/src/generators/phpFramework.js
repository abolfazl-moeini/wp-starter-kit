/**
 * @wpdev/create-wp-project — phpFramework generator.
 *
 * When `phpFramework:wpdev`, scaffolds the companion framework plugin,
 * writes the adapter registration bridge, adds the reference module,
 * and documents the integration seam.
 */

import fs from "node:fs";
import path from "node:path";
import { renderTemplate } from "./_templates.js";

function getFrameworkFiles() {
  const frameworkSrcDir =
    typeof __dirname !== "undefined" && __dirname
      ? path.resolve(__dirname, "../../../wpdev-framework")
      : path.resolve(process.cwd(), "packages/wpdev-framework");
  const files = {};

  if (!fs.existsSync(frameworkSrcDir)) {
    return files;
  }

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

  function walk(currentDir) {
    const list = fs.readdirSync(currentDir);
    for (const file of list) {
      if (
        file === "." ||
        file === ".." ||
        file === ".DS_Store" ||
        file === ".git" ||
        file === ".cursor" ||
        file === ".kiro" ||
        file === "context.md"
      ) {
        continue;
      }
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const rel = path.relative(frameworkSrcDir, fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        let content;
        if (binaryExtensions.has(ext)) {
          content = fs.readFileSync(fullPath); // returns Buffer
        } else {
          content = fs.readFileSync(fullPath, "utf8"); // returns string
        }
        files[`companion-plugins/wpdev/${rel}`] = content;
      }
    }
  }

  walk(frameworkSrcDir);
  return files;
}

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

const TEMPLATE_DEMO_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\WpdevDemo;

use {{frameworkNamespace}}\\Core\\ModuleInterface;
use {{vendor}}\\Support\\FrameworkBridge;

/**
 * Demo module showcasing integration with the WPDev Admin Framework.
 */
final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'wpdev-demo';
    }

    public function boot(): void
    {
        if (!FrameworkBridge::is_framework_active()) {
            return;
        }

        // Register a demo menu page using the framework's public API.
        if (function_exists('wpdev_register_menu_top')) {
            \\wpdev_register_menu_top('wpdev-demo-page', [
                'title'      => __('WPDev Demo', '{{textDomain}}'),
                'capability' => 'manage_options',
                'callback'   => [$this, 'render_demo_page'],
            ]);
        }
    }

    public function render_demo_page(): void
    {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html__('WPDev Framework Integration', '{{textDomain}}'); ?></h1>
            <p><?php echo esc_html__('This admin page was registered via the WPDev Admin Framework companion plugin API.', '{{textDomain}}'); ?></p>
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

const TEMPLATE_DOCS_MD = `# WPDev Framework Integration

This project opted into \`phpFramework: wpdev\`.

## Companion Plugin Model

The WPDev Admin Framework is installed as a companion plugin located under:
\`companion-plugins/wpdev/\`

If the framework is not active, the plugin displays a non-fatal warning in the WordPress Admin and disables any framework-dependent features safely without throwing fatal errors.

## Prefix Rules

When \`phpFramework: wpdev\` is enabled, the project reserves the \`wpdev\` hook prefix and the \`wpdev_\` PHP function prefix for the framework. Your custom prefix must be project-specific and not collide with the framework's prefixes.

## Module Lifecycles

Your kit modules boot sequentially as part of the standard kit bootstrap unless the WPDev Framework is active. When active, registering a module via the \`WpdevModuleAdapter::attach()\` helper defers the module's \`boot()\` lifecycle until the framework fires its \`wpdev_on_load\` hook.
`;

const REGISTER_FILE = "src/wpdev-demo-register.php";

export function run(ctx) {
  if (ctx.features.phpFramework !== "wpdev") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }

  const slug =
    ctx.vars?.slug || ctx.answers?.slug || ctx.cfg?.slug || "my-plugin";
  const tpl = {
    ...(ctx.answers || {}),
    ...(ctx.cfg || {}),
    ...(ctx.vars || {}),
    vendor: ctx.vars?.vendor || ctx.answers?.globalName || "WPDev",
    frameworkNamespace: ctx.vars?.frameworkNamespace || "WPDev",
    slug,
    slug_underscore: String(slug).replace(/-/g, "_"),
    textDomain: ctx.vars?.textDomain || ctx.answers?.textDomain || slug,
  };

  const files = {
    "src/Support/FrameworkBridge.php": renderTemplate(TEMPLATE_BRIDGE_PHP, tpl),
    "src/Modules/WpdevDemo/Module.php": renderTemplate(
      TEMPLATE_DEMO_MODULE_PHP,
      tpl,
    ),
    [REGISTER_FILE]: renderTemplate(TEMPLATE_REGISTER_PHP, tpl),
    "docs/wpdev-integration.md": renderTemplate(TEMPLATE_DOCS_MD, tpl),
    ...getFrameworkFiles(),
  };

  return {
    files,
    dirs: ["companion-plugins", "src/Support", "src/Modules/WpdevDemo", "docs"],
    deps: {},
    devDeps: {},
    composerPatches: {
      autoload: {
        files: [REGISTER_FILE],
      },
    },
  };
}

export const descriptor = {
  id: "phpFramework",
  feature: "phpFramework",
  owns: [
    "companion-plugins/wpdev/**",
    "src/Support/FrameworkBridge.php",
    "src/Modules/WpdevDemo/Module.php",
    REGISTER_FILE,
    "docs/wpdev-integration.md",
  ],
  run,
};
