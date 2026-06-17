/**
 * WordPress Abilities API (wp-mcp-integration) template mirror.
 *
 * Reads source from packages/mcp-integration/src/ at generation time so
 * generated projects stay in sync with the self-contained library.
 * Runtime namespace stays WPDev\MCP so the vendored copy is drop-in.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function createWpProjectSrcDir() {
  if (typeof __dirname !== "undefined" && __dirname) {
    return path.dirname(__dirname);
  }
  return path.join(process.cwd(), "packages/create-wp-project/src");
}

function mcpSrcRoot() {
  const srcDir = createWpProjectSrcDir();
  const candidates = [
    path.join(path.dirname(path.dirname(srcDir)), "mcp-integration", "src"),
    path.join(process.cwd(), "packages/mcp-integration/src"),
  ];
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "Core", "Plugin.php"))) {
      return candidate;
    }
  }
  throw new Error(
    "wp-mcp-integration source not found. Expected packages/mcp-integration/src beside create-wp-project.",
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
 * Kit bridge module: wires the vendored library into WPSK\Core\Plugin.
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
        return 'mcp-abilities';
    }

    public function boot(): void
    {
        McpPlugin::loader()->register(new McpExampleModule());
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
 * before WPDev\\Core\\Plugin::boot() at priority 10.
 */
if (!function_exists('add_action')) {
    return;
}

\\add_action(
    'plugins_loaded',
    static function (): void {
        Plugin::loader()->register(new Module());
    },
    5
);
`;
}
