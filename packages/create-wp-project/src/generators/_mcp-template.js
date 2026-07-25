/**
 * WordPress Abilities API (wp-mcp-integration) template mirror.
 *
 * Reads source from packages/mcp-integration/src/ at generation time so
 * generated projects stay in sync with the self-contained library.
 * Runtime namespace stays WPDev\MCP so the vendored copy is drop-in.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveKitPackageSrc } from "../resolve-kit-paths.js";

function mcpSrcRoot() {
  const root = resolveKitPackageSrc(
    "mcp-integration",
    path.join("Core", "Plugin.php"),
  );
  if (root) {
    return root;
  }
  throw new Error(
    "wp-mcp-integration source not found. Expected packages/mcp-integration/src beside create-wp-project (or set npm config wpdev-kit-root to your kit checkout).",
  );
}

function walkDir(dir, base = dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "vendor")
        continue;
      Object.assign(files, walkDir(full, base));
      continue;
    }
    if (entry.endsWith("Test.php")) continue;
    const rel = path.relative(base, full).replace(/\\/g, "/");
    files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

/**
 * @param {object} _ctx
 * @returns {Record<string, string>}
 */
export function mcpLibraryFiles(_ctx) {
  return walkDir(mcpSrcRoot());
}

/**
 * Kit bridge module: wires the vendored library into WPDev\Core\Plugin.
 *
 * Module slug is prefixed with {{slug}} so two kit plugins active on the
 * same site do not collide on the shared static ModuleLoader. The MCP
 * example-abilities module uses a process-wide WPDev\MCP\Core\Plugin
 * singleton, so register is idempotent.
 *
 * @param {object} _ctx
 * @returns {string}
 */
export function mcpBridgeModule(_ctx) {
  return `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\McpAbilities;

use {{frameworkNamespace}}\\Core\\ModuleInterface;
use WPDev\\MCP\\Core\\Plugin as McpPlugin;
use WPDev\\MCP\\Modules\\ExampleAbilities\\Module as McpExampleModule;

/**
 * Kit bridge module: boots the self-contained wp-mcp-integration
 * library. Abilities register on wp_abilities_api_init; this module
 * only supplies the project's ability namespace prefix.
 */
final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return '{{slug}}-mcp-abilities';
    }

    public function boot(): void
    {
        // WPDev\\MCP\\Core\\Plugin is a process-wide static singleton (PSR-4
        // autoload wins from whichever plugin loads first). A sibling kit
        // plugin may already own example-abilities — register idempotently.
        $loader = McpPlugin::loader();
        $example = new McpExampleModule();
        if (!$loader->has($example->get_slug())) {
            $loader->register($example);
        }
        McpPlugin::boot(['namespace' => '{{slug}}']);
    }
}
`;
}

/**
 * Early registration hook so the bridge module loads before Plugin::boot().
 *
 * @param {object} _ctx
 * @returns {string}
 */
export function mcpRegisterBootstrap(_ctx) {
  return `<?php
declare(strict_types=1);

use {{frameworkNamespace}}\\Core\\Plugin;
use {{vendor}}\\Modules\\McpAbilities\\Module;

/**
 * Registers the MCP Abilities bridge module on plugins_loaded (priority 5),
 * before WPDev\\Core\\Plugin::boot() at priority 10
 * (module boot_all runs at priority 11 inside Plugin).
 */
if (!function_exists('add_action')) {
    return;
}

\\add_action(
    'plugins_loaded',
    static function (): void {
        $loader = Plugin::loader();
        $module = new Module();
        if (!$loader->has($module->get_slug())) {
            $loader->register($module);
        }
    },
    5
);
if (did_action('plugins_loaded')) {
    $loader = Plugin::loader();
    $module = new Module();
    if (!$loader->has($module->get_slug())) {
        $loader->register($module);
    }
}
`;
}
