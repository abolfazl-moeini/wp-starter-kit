<?php
declare(strict_types=1);

namespace WPSK\Tests\Modules;

use PHPUnit\Framework\TestCase;
use WPSK\Modules\ExampleFeature\Module;

class ExampleFeatureAssetsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        wpsk_test_reset_wp_state();
        $GLOBALS['wpsk_test_wp_calls'] = [];
        $GLOBALS['wpsk_test_is_admin'] = true;
    }

    public function test_admin_enqueue_registers_example_feature_bundle(): void
    {
        $module = new Module();
        $module->enqueue_admin_assets();

        $calls = $GLOBALS['wpsk_test_wp_calls'] ?? [];
        $enqueue = array_filter(
            $calls,
            static fn (array $call): bool => ($call['fn'] ?? '') === 'wp_enqueue_script'
        );

        $this->assertNotEmpty($enqueue);
        $first = array_values($enqueue)[0];
        $this->assertSame('example-feature-admin', $first['args'][0]);
    }
}