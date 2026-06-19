<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use WPDev\Modules\ExampleFeature\Module;

class ExampleFeatureAssetsTest extends \WPDevTest\TestCases\TestCase
{
    public function setUp(): void
    {
        parent::setUp();
        set_current_screen('index');
    }

    public function test_register_admin_assets_registers_example_feature_bundle(): void
    {
        $module = new Module();
        $module->register_admin_assets();

        global $wp_scripts;
        $handle = 'example-feature-admin';
        $this->assertArrayHasKey($handle, $wp_scripts->registered, 'register_admin_assets must register the script');
        $this->assertFalse(wp_script_is($handle, 'enqueued'), 'register_admin_assets must not enqueue');
    }

    public function test_enqueue_admin_assets_enqueues_on_matching_admin_screen(): void
    {
        $module = new Module();
        $module->register_admin_assets();
        wp_dequeue_script('example-feature-admin');
        $module->enqueue_admin_assets('toplevel_page_example-feature');

        global $wp_scripts;
        $handle = 'example-feature-admin';
        $this->assertTrue(wp_script_is($handle, 'enqueued'), 'enqueue_admin_assets must enqueue on matching screen');
    }

    public function test_enqueue_admin_assets_skips_unrelated_admin_screen(): void
    {
        $module = new Module();
        $module->register_admin_assets();
        wp_dequeue_script('example-feature-admin');
        $module->enqueue_admin_assets('index.php');

        global $wp_scripts;
        $handle = 'example-feature-admin';
        $this->assertFalse(wp_script_is($handle, 'enqueued'), 'enqueue_admin_assets must skip unrelated screens');
    }
}