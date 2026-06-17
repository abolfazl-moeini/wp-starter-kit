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
        return 'mcp-abilities';
    }

    public function boot(): void
    {
        $config = Plugin::config();
        $slug = $config['slug'] ?? 'wpdev-starter';
        $hookPrefix = $config['hookPrefix'] ?? 'wpdev';
        McpPlugin::loader()->register(new McpExampleModule());
        McpPlugin::boot(['namespace' => (string) $slug, 'hookPrefix' => $hookPrefix . '_mcp']);
    }
}