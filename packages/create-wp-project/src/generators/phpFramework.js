/**
 * @wpdev/create-wp-project — phpFramework generator.
 *
 * When `phpFramework:wpdev`, scaffolds host-plugin bridge + docs.
 * WPDev Admin Framework is expected as a separate WordPress plugin
 * (already installed on the site). Does NOT create companion-plugins/,
 * does NOT clone/submodule wpdev-core, and does NOT add it to Composer.
 *
 * The main plugin bootstrap gets an admin notice when the framework is
 * inactive (injected via core template / ensureWpdevDependencyNotice).
 */

import { renderTemplate } from "./_templates.js";

const TEMPLATE_BRIDGE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Support;

use {{frameworkNamespace}}\\Adapters\\WpdevModuleAdapter;

/**
 * Bridge helper for WPDev Admin Framework integration.
 *
 * The framework must be installed and activated as a separate WordPress
 * plugin. It is not a Composer dependency and is not vendored into this
 * project.
 */
final class FrameworkBridge
{
    public static function is_framework_active(): bool
    {
        return WpdevModuleAdapter::is_framework_active();
    }

    /**
     * Soft-dep bootstrap. Admin notice for a missing framework lives in
     * the main plugin file; this method is kept for call-site BC.
     */
    public static function init(): void
    {
        // Intentionally empty — main plugin bootstrap shows the notice.
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
        // Prefixed with plugin slug so co-installed kit plugins do not
        // collide on the shared static WPDev\\Core\\ModuleLoader.
        return '{{slug}}-wpdev-demo';
    }

    public function boot(): void
    {
        if (!FrameworkBridge::is_framework_active()) {
            return;
        }
        // Soft-dep: only call framework APIs when the framework plugin is active.
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

Install and activate **WPDev Admin Framework** as a normal WordPress plugin
on the site (e.g. under \`wp-content/plugins/wpdev\`).

This scaffold does **not** vendor the framework into the project and does
**not** create a \`companion-plugins/\` directory.

**Forbidden as primary method:** listing the admin framework in Composer
\`require\`.

## Host plugin rules

- Scaffold emits \`Requires Plugins: wpdev\` on the host plugin header (WP 6.5+)
- Soft-dep: the main plugin file shows an admin notice when the framework is inactive
- Soft-dep helpers: \`function_exists( 'wpdev_register_table' )\` / \`FrameworkBridge::is_framework_active()\`
- Do **not** list the admin framework in Composer \`require\`
- WP 6.7+: load host textdomain on \`init\` (priority 1); defer \`__( ..., host-domain )\` used in settings registration until \`init\` (see \`docs/plugin-bootstrap.md\`)

## Kit module framework (separate)

\`packages/framework/\` is the **starter-kit module runtime** (\`WPDev\\Core\\Plugin\`, etc.).
It is autoloaded via Composer PSR-4, not Packagist \`wpdev/framework\`.
`;

const REGISTER_FILE = "src/wpdev-demo-register.php";

/** WordPress plugin header line (WP 6.5+ dependency declaration). */
export const REQUIRES_PLUGINS_WPDEV_LINE = " * Requires Plugins: wpdev";

/**
 * PHP snippet injected into the main plugin bootstrap when phpFramework=wpdev.
 * Checks at admin_notices time so plugin load order does not matter.
 *
 * @param {{ slug_underscore?: string, textDomain?: string, name?: string }} tpl
 * @returns {string}
 */
export function buildWpdevDependencyNoticeBlock(tpl = {}) {
  const slugUnderscore = String(tpl.slug_underscore || "my_plugin");
  const textDomain = String(tpl.textDomain || "my-plugin");
  const name = String(tpl.name || tpl.slug || "This plugin");
  return `
/*
 * -----------------------------------------------------------------------------
 * WPDev Admin Framework dependency (phpFramework:wpdev)
 * -----------------------------------------------------------------------------
 * Soft dependency: show an admin notice when the framework plugin is not
 * active. Feature modules that need the framework no-op until it is present.
 * BEGIN wpdev-dependency-notice
 */
add_action( 'admin_notices', '${slugUnderscore}_wpdev_dependency_notice' );
/**
 * @return void
 */
function ${slugUnderscore}_wpdev_dependency_notice() {
	if ( function_exists( 'wpdev_register_table' ) ) {
		return;
	}
	if ( function_exists( 'current_user_can' ) && ! current_user_can( 'activate_plugins' ) ) {
		return;
	}
	printf(
		'<div class="notice notice-warning"><p>%s</p></div>',
		esc_html(
			sprintf(
				/* translators: %s: plugin name */
				__( '%s requires the WPDev Admin Framework plugin to be installed and active.', '${textDomain}' ),
				'${name.replace(/'/g, "\\'")}'
			)
		)
	);
}
/* END wpdev-dependency-notice */
`;
}

/**
 * Inject the WPDev dependency admin-notice block into a plugin bootstrap.
 * Idempotent. Returns original content when already present.
 *
 * @param {string} phpSource
 * @param {{ slug_underscore?: string, textDomain?: string, name?: string, slug?: string }} tpl
 * @returns {{ content: string, changed: boolean }}
 */
export function ensureWpdevDependencyNotice(phpSource, tpl = {}) {
  const src = String(phpSource ?? "");
  if (
    /BEGIN wpdev-dependency-notice/i.test(src) ||
    /_wpdev_dependency_notice\s*\(/i.test(src)
  ) {
    return { content: src, changed: false };
  }
  const block = buildWpdevDependencyNoticeBlock(tpl);
  // Prefer after Composer autoload section; else before final Plugin::boot block; else append.
  if (/Composer autoloaders/i.test(src)) {
    // Insert after the autoload block's closing `}` of the elseif vendor missing branch,
    // just before Lifecycle or Translation section.
    const lifecycle = src.search(/\/\*\s*\n\s*\*\s*-+\s*\n\s*\*\s*Lifecycle:/);
    if (lifecycle !== -1) {
      const content =
        src.slice(0, lifecycle) + block + "\n" + src.slice(lifecycle);
      return { content, changed: true };
    }
  }
  if (/Wire WPDev\\Core\\Plugin/i.test(src) || /Plugin::boot/i.test(src)) {
    const idx = src.search(/\/\*\s*\n\s*\*\s*-+\s*\n\s*\*\s*Wire WPDev/);
    if (idx !== -1) {
      const content = src.slice(0, idx) + block + "\n" + src.slice(idx);
      return { content, changed: true };
    }
  }
  const content = src.trimEnd() + "\n" + block + "\n";
  return { content, changed: true };
}

/**
 * Remove the wpdev dependency notice block (removeFeature path).
 *
 * @param {string} phpSource
 * @returns {{ content: string, changed: boolean }}
 */
export function stripWpdevDependencyNotice(phpSource) {
  const src = String(phpSource ?? "");
  // Prefer marked block (BEGIN…END), spanning the start/end comments.
  let content = src.replace(
    /\/\*[\s\S]*?BEGIN wpdev-dependency-notice[\s\S]*?END wpdev-dependency-notice\s*\*\//gi,
    "",
  );
  // Fallback: function + add_action by name pattern.
  if (content === src) {
    content = src
      .replace(
        /\r?\n?add_action\s*\(\s*['"]admin_notices['"]\s*,\s*['"][^'"]*_wpdev_dependency_notice['"]\s*\)\s*;\r?\n?/g,
        "\n",
      )
      .replace(
        /\r?\n?(?:\/\*\*[\s\S]*?\*\/\r?\n)?function\s+\w+_wpdev_dependency_notice\s*\([^)]*\)\s*(?::\s*void\s*)?\{[\s\S]*?\n\}\r?\n?/g,
        "\n",
      );
  }
  content = content.replace(/\n{3,}/g, "\n\n");
  return { content, changed: content !== src };
}

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
  };

  return {
    files,
    dirs: ["src/Support", "src/Modules/WpdevDemo", "docs"],
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
    "src/Support/FrameworkBridge.php",
    "src/Modules/WpdevDemo/Module.php",
    REGISTER_FILE,
    "docs/wpdev-integration.md",
    "MIGRATION-NOTES-1.0.0.md",
  ],
  run,
};
