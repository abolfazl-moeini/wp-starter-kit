<?php
declare(strict_types=1);

namespace WPSK\Modules\ExampleFeature;

use WPSK\Core\ModuleInterface;
use WPSK\Core\Plugin;
use WPSK\Modules\ExampleFeature\Rest\ItemsController;
use WPSK\Support\Assets;
use WPSK\Support\Rest\RestSetup;

final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function boot(): void
    {
        RestSetup::register(ItemsController::class);

        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function enqueue_admin_assets(): void
    {
        if (!function_exists('is_admin') || !is_admin()) {
            return;
        }

        Assets::enqueue_bundle_script(
            'example-feature-admin',
            'assets/bundles/ExampleFeature-admin.js'
        );
    }
}