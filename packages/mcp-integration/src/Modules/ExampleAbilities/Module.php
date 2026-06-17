<?php
declare(strict_types=1);

namespace WPDev\MCP\Modules\ExampleAbilities;

use WPDev\MCP\Abilities\AbilityRegistry;
use WPDev\MCP\Core\ModuleInterface;

/**
 * Ships the two example abilities. boot() only adds them to the
 * registry; the registry performs WordPress registration on the
 * wp_abilities_api_init hook.
 */
final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'example-abilities';
    }

    public function boot(): void
    {
        $registry = AbilityRegistry::instance();
        $registry->register(new GetPostsAbility());
        $registry->register(new CreatePostAbility());
    }
}