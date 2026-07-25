<?php
declare(strict_types=1);

namespace WPDev\Modules\McpAbilities;

use WPDev\Core\ModuleInterface;
use WPDev\Core\Plugin;
use WPDev\MCP\Core\Plugin as McpPlugin;
use WPDev\MCP\Modules\ExampleAbilities\Module as McpExampleModule;

/**
 * Kit bridge module: wires wp-mcp-integration into the starter plugin.
 */
final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        // Prefixed with kit slug so co-installed consumer plugins do not
        // collide on the shared static WPDev\Core\ModuleLoader.
        return 'wpdev-starter-mcp-abilities';
    }

    public function boot(): void
    {
        $config = Plugin::config();
        $slug = $config['slug'] ?? 'wpdev-starter';
        $hookPrefix = $config['hookPrefix'] ?? 'wpdev';
        // WPDev\MCP\Core\Plugin is process-wide; sibling plugins may already
        // own example-abilities — register idempotently.
        $loader = McpPlugin::loader();
        $example = new McpExampleModule();
        if (!$loader->has($example->get_slug())) {
            $loader->register($example);
        }
        McpPlugin::boot(['namespace' => (string) $slug, 'hookPrefix' => $hookPrefix . '_mcp']);
    }
}
