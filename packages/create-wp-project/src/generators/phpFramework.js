/**
 * @wpdev/create-wp-project — phpFramework generator.
 *
 * When `phpFramework:wpdev`, scaffolds host-plugin bridge + docs and
 * leaves companion-plugins/wpdev for **git submodule/clone of wpdev-core**
 * (skill INSTALL-AND-DISTRIBUTE). Does NOT copy framework files and does
 * NOT add wpdev-core to Composer.
 */

import { renderTemplate } from "./_templates.js";

const TEMPLATE_BRIDGE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Support;

use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;

/**
 * Bridge helper for WPDev Admin Framework (wpdev-core) integration.
 *
 * The framework must be installed as a separate WordPress plugin
 * (git submodule/clone at companion-plugins/wpdev or {PLUGINS}/wpdev).
 * It is not a Composer dependency.
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
        if (!\\current_user_can('activate_plugins')) {
            return;
        }
        echo '<div class="notice notice-warning"><p>';
        echo \\esc_html__(
            'This plugin works best with the WPDev Admin Framework. Install and activate wpdev-core (companion-plugins/wpdev or wp-content/plugins/wpdev).',
            '{{textDomain}}'
        );
        echo '</p></div>';
    }
}
`;

const TEMPLATE_DEMO_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\WpdevDemo;

use {{frameworkNamespace}}\\Core\\ModuleInterface;
use {{vendor}}\\Support\\FrameworkBridge;

/**
 * Reference module: boots only when WPDev Admin Framework is active.
 * Standalone-safe: no extends of framework classes at load time.
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
        // Soft-dep: only call framework APIs when the companion plugin is active.
        if (\\function_exists('wpdev_register_module_admin_pages')) {
            // Register demo admin surfaces when framework APIs are available.
        }
    }
}
`;

const TEMPLATE_REGISTER_PHP = `<?php
declare(strict_types=1);

/**
 * Wire the WpdevDemo module when the WPDev Admin Framework is present.
 */

use {{vendor}}\\Modules\\WpdevDemo\\Module;
use {{vendor}}\\Support\\FrameworkBridge;
use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;

if (!\\function_exists('{{slug_underscore}}register_wpdev_demo')) {
    /**
     * @return void
     */
    function {{slug_underscore}}register_wpdev_demo(): void
    {
        FrameworkBridge::init();
        if (\\class_exists(WpdevModuleAdapter::class)) {
            WpdevModuleAdapter::attach(new Module());
        }
    }
}

\\add_action('plugins_loaded', '{{slug_underscore}}register_wpdev_demo', 20);
`;

const TEMPLATE_DOCS_MD = `# WPDev Admin Framework integration

This project has \`phpFramework: wpdev\`.

## Install the framework (required)

Per WPDev skills (**INSTALL-AND-DISTRIBUTE** / **SHARED-PATHS**):

**Preferred — git submodule** (host project is a git repo):

\`\`\`bash
git submodule add https://github.com/abolfazl-moeini/wpdev-core.git companion-plugins/wpdev
git submodule update --init --recursive
\`\`\`

**If the host is not a git repo — clone:**

\`\`\`bash
git clone https://github.com/abolfazl-moeini/wpdev-core.git companion-plugins/wpdev
\`\`\`

Then activate **WPDev** under WordPress → Plugins.

Alternatively install into \`wp-content/plugins/wpdev\` (site-wide) instead of
\`companion-plugins/wpdev\`.

**Forbidden as primary method:** copying with absolute paths from another machine.

## Host plugin rules

- Scaffold emits \`Requires Plugins: wpdev\` on the host plugin header (WP 6.5+)
- Soft-dep: \`function_exists( 'wpdev_services' )\` / \`FrameworkBridge::is_framework_active()\`
- Do **not** list the admin framework in Composer \`require\`

## Kit module framework (separate)

\`packages/framework/\` is the **starter-kit module runtime** (\`WPDev\\Core\\Plugin\`, etc.).
It is autoloaded via Composer PSR-4, not Packagist \`wpdev/framework\`.
`;

const REGISTER_FILE = "src/wpdev-demo-register.php";

/** Marker consumed by runCreate to install the submodule after files are written. */
export const WPDEV_CORE_INSTALL_MARKER =
  "companion-plugins/wpdev/.wpdev-core-install";

/** WordPress plugin header line (WP 6.5+ dependency declaration). */
export const REQUIRES_PLUGINS_WPDEV_LINE = " * Requires Plugins: wpdev";

/**
 * Inject `Requires Plugins: wpdev` into a plugin bootstrap file header.
 * Idempotent. Returns original content when the header is already present
 * or when the file does not look like a plugin bootstrap.
 *
 * @param {string} phpSource
 * @returns {{ content: string, changed: boolean }}
 */
export function ensureRequiresPluginsWpdevHeader(phpSource) {
  const src = String(phpSource ?? "");
  if (/Requires\s+Plugins\s*:\s*wpdev/i.test(src)) {
    return { content: src, changed: false };
  }
  // Insert after Domain Path when present; else after Text Domain; else
  // before the closing `*/` of the first docblock.
  if (/^\s*\*\s*Domain Path\s*:/im.test(src)) {
    const content = src.replace(
      /^(\s*\*\s*Domain Path\s*:[^\n]*\n)/im,
      `$1${REQUIRES_PLUGINS_WPDEV_LINE}\n`,
    );
    return { content, changed: content !== src };
  }
  if (/^\s*\*\s*Text Domain\s*:/im.test(src)) {
    const content = src.replace(
      /^(\s*\*\s*Text Domain\s*:[^\n]*\n)/im,
      `$1${REQUIRES_PLUGINS_WPDEV_LINE}\n`,
    );
    return { content, changed: content !== src };
  }
  const content = src.replace(
    /^(\s*\*\/)/m,
    `${REQUIRES_PLUGINS_WPDEV_LINE}\n$1`,
  );
  return { content, changed: content !== src };
}

/**
 * Remove the wpdev Requires Plugins header line (removeFeature path).
 *
 * @param {string} phpSource
 * @returns {{ content: string, changed: boolean }}
 */
export function stripRequiresPluginsWpdevHeader(phpSource) {
  const src = String(phpSource ?? "");
  const content = src.replace(
    /^[ \t]*\*[ \t]*Requires\s+Plugins\s*:\s*wpdev[ \t]*\r?\n/gim,
    "",
  );
  return { content, changed: content !== src };
}

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
    // Marker file: signals post-scaffold to run git submodule/clone.
    [WPDEV_CORE_INSTALL_MARKER]:
      "wpdev-core\nhttps://github.com/abolfazl-moeini/wpdev-core.git\n",
  };

  return {
    files,
    dirs: ["src/Support", "src/Modules/WpdevDemo", "docs", "companion-plugins"],
    deps: {},
    devDeps: {},
    composerPatches: {
      autoload: {
        files: [REGISTER_FILE],
      },
    },
    // Soft signal for create/post-run (also detected via marker file).
    postScaffold: { installWpdevCore: true },
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
    "MIGRATION-NOTES-1.0.0.md",
  ],
  run,
};
