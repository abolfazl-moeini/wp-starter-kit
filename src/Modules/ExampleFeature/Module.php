<?php
declare(strict_types=1);

namespace WPDev\Modules\ExampleFeature;

use WPDev\Core\AbstractModule;
use WPDev\Core\ModuleInterface;
use WPDev\Modules\ExampleFeature\Rest\ItemsController;
use WPDev\Support\Assets;
use WPDev\Support\Rest\RestSetup;

final class Module extends AbstractModule implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function should_boot(): bool
    {
        return function_exists('is_admin') && is_admin();
    }

    public function boot(): void
    {
        RestSetup::register(ItemsController::class);

        add_action('admin_init', [$this, 'register_admin_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_admin_assets(): void
    {
        Assets::register_bundle_script(
            'example-feature-admin',
            'assets/bundles/ExampleFeature-admin.js'
        );
    }

    public function enqueue_admin_assets(string $hook): void
    {
        if ($hook !== 'toplevel_page_example-feature') {
            return;
        }

        Assets::enqueue_bundle_script('example-feature-admin');
    }
}