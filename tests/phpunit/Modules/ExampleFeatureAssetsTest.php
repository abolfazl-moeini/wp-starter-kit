<?php
declare(strict_types=1);

namespace WPDev\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPDev\Modules\ExampleFeature\Module;

class ExampleFeatureAssetsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        $GLOBALS['wpsk_test_wp_calls'] = [];
        $GLOBALS['wpsk_test_is_admin'] = true;
    }

    public function test_register_admin_assets_registers_example_feature_bundle(): void
    {
        $module = new Module();
        $module->register_admin_assets();

        $calls = $GLOBALS['wpsk_test_wp_calls'] ?? [];
        $register = array_filter(
            $calls,
            static fn (array $call): bool => ($call['fn'] ?? '') === 'wp_register_script'
        );
        $enqueue = array_filter(
            $calls,
            static fn (array $call): bool => ($call['fn'] ?? '') === 'wp_enqueue_script'
        );

        $this->assertNotEmpty($register);
        $this->assertEmpty($enqueue, 'register_admin_assets must not enqueue');

        $first = array_values($register)[0];
        $this->assertSame('example-feature-admin', $first['args'][0]);
    }

    public function test_enqueue_admin_assets_enqueues_on_matching_admin_screen(): void
    {
        $module = new Module();
        $module->register_admin_assets();
        $GLOBALS['wpsk_test_wp_calls'] = [];

        $module->enqueue_admin_assets('toplevel_page_example-feature');

        $calls = $GLOBALS['wpsk_test_wp_calls'] ?? [];
        $enqueue = array_filter(
            $calls,
            static fn (array $call): bool => ($call['fn'] ?? '') === 'wp_enqueue_script'
        );

        $this->assertNotEmpty($enqueue);
        $first = array_values($enqueue)[0];
        $this->assertSame('example-feature-admin', $first['args'][0]);
    }

    public function test_enqueue_admin_assets_skips_unrelated_admin_screen(): void
    {
        $module = new Module();
        $module->register_admin_assets();
        $GLOBALS['wpsk_test_wp_calls'] = [];

        $module->enqueue_admin_assets('index.php');

        $calls = $GLOBALS['wpsk_test_wp_calls'] ?? [];
        $enqueue = array_filter(
            $calls,
            static fn (array $call): bool => ($call['fn'] ?? '') === 'wp_enqueue_script'
        );

        $this->assertEmpty($enqueue);
    }
}