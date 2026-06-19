<?php
declare(strict_types=1);

namespace WPDev\Tests\Release;


class VendorScopingIntegrationTest extends \WPDevTest\TestCases\TestCase
{
    private string $fixtures;

    public function setUp(): void
    {
        parent::setUp();
        $this->fixtures = dirname(__DIR__, 2) . '/fixtures/conflict-plugins';
    }

    public function test_both_scoped_plugins_bootstrap_without_fatal_error(): void
    {
        require $this->fixtures . '/plugin-alpha/plugin-alpha.php';
        require $this->fixtures . '/plugin-beta/plugin-beta.php';

        $this->assertTrue(class_exists('AlphaVendor\\GuzzleHttp\\Client'));
        $this->assertTrue(class_exists('BetaVendor\\GuzzleHttp\\Client'));
    }

    public function test_scoped_guzzle_classes_live_under_distinct_prefixes(): void
    {
        require_once $this->fixtures . '/plugin-alpha/plugin-alpha.php';
        require_once $this->fixtures . '/plugin-beta/plugin-beta.php';

        $alpha = new \AlphaVendor\GuzzleHttp\Client();
        $beta = new \BetaVendor\GuzzleHttp\Client();

        $this->assertSame('6.5.0', $alpha::VERSION);
        $this->assertSame('7.8.0', $beta::VERSION);
        $this->assertNotSame(get_class($alpha), get_class($beta));
    }

    public function test_wordpress_globals_are_not_prefixed(): void
    {
        $this->assertTrue(function_exists('add_action'));
        $this->assertTrue(function_exists('register_rest_route'));
    }

    public function test_fixture_strauss_configs_use_expected_vendor_prefixes(): void
    {
        $alpha = json_decode(
            (string) file_get_contents($this->fixtures . '/plugin-alpha/strauss.json'),
            true
        );
        $beta = json_decode(
            (string) file_get_contents($this->fixtures . '/plugin-beta/strauss.json'),
            true
        );

        $this->assertSame('AlphaVendor', $alpha['namespace_prefix']);
        $this->assertSame('BetaVendor', $beta['namespace_prefix']);
    }
}